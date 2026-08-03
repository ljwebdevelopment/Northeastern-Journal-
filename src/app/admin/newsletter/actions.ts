"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, CONTENT_CACHE_TAG } from "@/lib/supabase/server";
import { getSessionUser, isStaff } from "@/lib/auth/roles";
import { slugify } from "@/lib/richtext";
import { sendNewsletterIssue, sendNewsletterTest } from "@/lib/email/send";
import { issueView, resolveIssue, suggestIssueContent } from "@/lib/newsletter/issue";
import type { ActionState } from "@/app/admin/actions";
import type { NewsletterIssueRow } from "@/lib/supabase/types";

/**
 * Composing and sending the weekly newsletter.
 *
 * The one rule that matters here: an issue is flipped to `sent` *before* the
 * mail goes out, and only if it was still a draft at that moment. Postgres
 * settles the race, so a double-click, a retried request, or two editors both
 * hitting send can produce at most one blast. If nothing actually ships, the
 * flip is rolled back so it can be tried again.
 */

const ok = (message: string): ActionState => ({ ok: true, message });
const fail = (message: string, errors?: Record<string, string>): ActionState => ({
  ok: false,
  message,
  errors,
});

const str = (form: FormData, key: string) => (form.get(key) as string | null)?.trim() ?? "";

/** Multi-value fields arrive once per checked box, already in display order. */
const ids = (form: FormData, key: string) =>
  form.getAll(key).map(String).filter(Boolean);

async function staffSupabase() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.profile.role)) return { user: null, supabase: null };
  const supabase = await createServerSupabase();
  return { user, supabase };
}

const defaultTitle = () =>
  `The Sunday Letter — ${new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

/** Appends -2, -3, … until the slug is free. Mirrors the article editor. */
async function uniqueSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>,
  base: string,
  currentId: string | null
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase
      .from("newsletter_issues")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === currentId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Starts a new issue, pre-filled.
 *
 * The point of the feature is that an editor opens it and finds the week
 * already assembled — lead, new reporting, and trending all chosen — with only
 * the note left to write. Everything picked here is editable afterwards.
 */
export async function createIssueForm() {
  const { user, supabase } = await staffSupabase();
  if (!user || !supabase) redirect("/admin?error=admin-only");

  const suggestion = await suggestIssueContent(supabase);
  const title = defaultTitle();

  const { data, error } = await supabase
    .from("newsletter_issues")
    .insert({
      slug: await uniqueSlug(supabase, slugify(title), null),
      title,
      summary: "",
      intro: "",
      lead_article_id: suggestion.leadId,
      latest_ids: suggestion.latestIds,
      trending_ids: suggestion.trendingIds,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/admin/newsletter?notice=${encodeURIComponent(error?.message ?? "Could not start an issue.")}`);
  }

  revalidatePath("/admin/newsletter");
  redirect(`/admin/newsletter/${data.id}`);
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export async function saveIssue(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, supabase } = await staffSupabase();
  if (!user || !supabase) return fail("Only editors and administrators can send the newsletter.");

  const id = str(formData, "id");
  if (!id) return fail("Missing issue.");

  const title = str(formData, "title");
  if (!title) return fail("Give the issue a title.", { title: "A subject line is required." });

  const { data: existing } = await supabase
    .from("newsletter_issues")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return fail("That issue no longer exists.");
  if (existing.status === "sent") {
    return fail("This issue has already been sent and can no longer be edited.");
  }

  const lead = str(formData, "lead_article_id");
  const latest = ids(formData, "latest_ids");
  const trending = ids(formData, "trending_ids");

  const { error } = await supabase
    .from("newsletter_issues")
    .update({
      slug: await uniqueSlug(supabase, slugify(title), id),
      title,
      summary: str(formData, "summary"),
      intro: str(formData, "intro"),
      lead_article_id: lead || null,
      // The lead is shown in full at the top; repeating it in the list below
      // would read as an editing mistake.
      latest_ids: latest.filter((articleId) => articleId !== lead),
      trending_ids: trending.filter((articleId) => articleId !== lead),
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidatePath(`/admin/newsletter/${id}`);
  revalidatePath("/admin/newsletter");
  return ok("Draft saved.");
}

// ---------------------------------------------------------------------------
// Test send
// ---------------------------------------------------------------------------

/** Sends the issue to the signed-in editor's own address and nobody else. */
export async function sendTestForm(formData: FormData) {
  const { user, supabase } = await staffSupabase();
  if (!user || !supabase) redirect("/admin?error=admin-only");

  const id = String(formData.get("id"));
  const { data: issue } = await supabase
    .from("newsletter_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!issue) redirect("/admin/newsletter");

  const snapshot = await resolveIssue(supabase, issue as NewsletterIssueRow);
  const result = await sendNewsletterTest(
    user.email,
    issueView(issue as NewsletterIssueRow, snapshot)
  );

  redirect(`/admin/newsletter/${id}?notice=${encodeURIComponent(result.message)}`);
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

export async function sendIssueForm(formData: FormData) {
  const { user, supabase } = await staffSupabase();
  if (!user || !supabase) redirect("/admin?error=admin-only");

  const id = String(formData.get("id"));
  const { data: issue } = await supabase
    .from("newsletter_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!issue) redirect("/admin/newsletter");

  const row = issue as NewsletterIssueRow;
  if (row.status === "sent") {
    redirect(
      `/admin/newsletter/${id}?notice=${encodeURIComponent("This issue has already been sent.")}`
    );
  }

  // Resolve first: the snapshot has to be built from live articles, and once
  // the row flips to `sent` it would read from the (still empty) snapshot.
  const snapshot = await resolveIssue(supabase, row);

  if (!snapshot.lead && snapshot.latest.length === 0 && snapshot.trending.length === 0) {
    redirect(
      `/admin/newsletter/${id}?notice=${encodeURIComponent(
        "Add at least one article before sending."
      )}`
    );
  }

  const sentAt = new Date().toISOString();

  /*
   * Claim the send. `.eq("status", "draft")` is the guard: whoever's update
   * matches the row first gets a row back, and everyone else gets none. Without
   * it, two concurrent clicks would both read 'draft' and both send.
   */
  const { data: claimed } = await supabase
    .from("newsletter_issues")
    .update({ status: "sent", sent_at: sentAt, sent_by: user.id, snapshot })
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    redirect(
      `/admin/newsletter/${id}?notice=${encodeURIComponent("This issue has already been sent.")}`
    );
  }

  const result = await sendNewsletterIssue({
    ...issueView({ ...row, sent_at: sentAt }, snapshot),
    issueId: row.id,
    sentBy: user.id,
  });

  if (result.sent === 0 && !result.ok) {
    // Nothing left the building — put it back so it can be retried.
    await supabase
      .from("newsletter_issues")
      .update({ status: "draft", sent_at: null, sent_by: null, snapshot: null })
      .eq("id", id);
  } else {
    await supabase
      .from("newsletter_issues")
      .update({
        recipients: result.sent + result.failed,
        succeeded: result.sent,
        failed: result.failed,
      })
      .eq("id", id);
  }

  // A sent issue becomes a public archive page.
  updateTag(CONTENT_CACHE_TAG);
  revalidatePath("/newsletter", "layout");
  revalidatePath("/admin/newsletter");

  redirect(`/admin/newsletter/${id}?notice=${encodeURIComponent(result.message)}`);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/** Drafts only. A sent issue is part of the public archive. */
export async function deleteIssueForm(formData: FormData) {
  const { user, supabase } = await staffSupabase();
  if (!user || !supabase) redirect("/admin?error=admin-only");

  const id = String(formData.get("id"));
  await supabase.from("newsletter_issues").delete().eq("id", id).eq("status", "draft");

  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter?notice=" + encodeURIComponent("Draft deleted."));
}
