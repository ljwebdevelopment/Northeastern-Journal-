"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { marked } from "marked";
import { createServerSupabase, CONTENT_CACHE_TAG } from "@/lib/supabase/server";
import { getSessionUser, canPublish, canWrite } from "@/lib/auth/roles";
import {
  autoExcerpt,
  countWords,
  htmlToText,
  readingMinutesFor,
  sanitizeArticleHtml,
  slugify,
} from "@/lib/richtext";
import { sendArticleAnnouncement } from "@/lib/email/send";
import { emailConfig } from "@/lib/email/resend";
import type { ArticleRow, ArticleStatus, UserRole } from "@/lib/supabase/types";

export interface ActionState {
  ok: boolean;
  message: string;
  /** Field-level validation errors, keyed by input name. */
  errors?: Record<string, string>;
  articleId?: string;
}

const ok = (message: string, extra: Partial<ActionState> = {}): ActionState => ({
  ok: true,
  message,
  ...extra,
});
const fail = (message: string, errors?: Record<string, string>): ActionState => ({
  ok: false,
  message,
  errors,
});

/**
 * Clears the public site's data cache so a publish appears immediately.
 *
 * `updateTag` rather than `revalidateTag`: it gives read-your-own-writes
 * inside a Server Action, so the editor sees the new state on the very next
 * render instead of a stale one.
 */
function refreshPublicSite() {
  updateTag(CONTENT_CACHE_TAG);
  revalidatePath("/", "layout");
}

const str = (form: FormData, key: string) => (form.get(key) as string | null)?.trim() ?? "";
const bool = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";

// ---------------------------------------------------------------------------
// Save (create or update) an article
// ---------------------------------------------------------------------------

/**
 * One action handles the whole editor. Which button was pressed arrives as
 * `intent`, and that alone decides the resulting status:
 *
 *   save      → keep the current status (draft stays draft, live stays live)
 *   draft     → move back to draft (this is "unpublish")
 *   publish   → live now
 *   schedule  → live at `scheduled_for`
 *   archive   → hidden from the public, kept in the archive
 */
export async function saveArticle(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !canWrite(user.profile.role)) {
    return fail("You don't have permission to write articles.");
  }

  const supabase = await createServerSupabase();
  if (!supabase) return fail("Supabase is not configured.");

  const id = str(formData, "id");
  const intent = str(formData, "intent") || "save";
  const title = str(formData, "title");

  if (!title) return fail("A title is required.", { title: "Give the article a title." });

  // --- Body: rich text wins; markdown is a fallback input mode -------------
  const markdown = str(formData, "body_markdown");
  const rawHtml = str(formData, "body_html");
  const html = rawHtml || (markdown ? await marked.parse(markdown) : "");
  const bodyHtml = sanitizeArticleHtml(html);
  const plain = htmlToText(bodyHtml);

  if (intent === "publish" || intent === "schedule") {
    if (!plain) return fail("An empty article can't be published.", { body: "Write something first." });
  }

  // --- Slug: auto-generated from the title, uniqued on collision -----------
  const requestedSlug = slugify(str(formData, "slug") || title);
  const slug = await ensureUniqueSlug(supabase, requestedSlug || "untitled", id || null);

  // --- Status ---------------------------------------------------------------
  /*
   * Scheduling times.
   *
   * A `datetime-local` input submits "2026-08-01T14:30" with no timezone, and
   * `new Date()` on the server would read that as 14:30 *server* time — UTC on
   * Vercel. An editor in Oklahoma scheduling 2pm would publish at 9am their
   * time. So the browser also submits `scheduled_for_iso`, an absolute
   * timestamp it computed in the reader's own timezone, and that wins.
   *
   * The bare field remains the fallback for a no-JS submit, where interpreting
   * it as server time is the only option available.
   */
  const scheduledIso = str(formData, "scheduled_for_iso");
  const scheduledRaw = scheduledIso || str(formData, "scheduled_for");
  const scheduledFor = scheduledRaw ? new Date(scheduledRaw) : null;
  const scheduleFieldPresent = formData.has("scheduled_for");

  // The current status matters when the intent is a plain "save": we must not
  // strand a scheduled article by wiping its date out from under it.
  let existingStatus: ArticleStatus | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("articles")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    existingStatus = existing?.status ?? null;
  }

  let status: ArticleStatus | null = null;
  switch (intent) {
    case "publish":
      if (!canPublish(user.profile.role)) {
        return fail("Contributors can't publish. Save a draft and an editor will review it.");
      }
      status = "published";
      break;
    case "schedule":
      if (!canPublish(user.profile.role)) {
        return fail("Contributors can't schedule. Save a draft and an editor will review it.");
      }
      if (!scheduledFor || Number.isNaN(+scheduledFor)) {
        return fail("Pick a date and time to schedule.", {
          scheduled_for: "Choose when this should go live.",
        });
      }
      if (scheduledFor.getTime() <= Date.now()) {
        return fail("Scheduled time must be in the future.", {
          scheduled_for: "That time has already passed.",
        });
      }
      status = "scheduled";
      break;
    case "draft":
      status = "draft";
      break;
    case "archive":
      status = "archived";
      break;
    default:
      status = null; // "save" — leave the existing status alone
  }

  // --- Everything else ------------------------------------------------------
  const excerpt = str(formData, "excerpt") || autoExcerpt(bodyHtml);
  const categorySlug = str(formData, "category");
  const authorSlug = str(formData, "author");

  const [categoryId, authorId] = await Promise.all([
    lookupId(supabase, "categories", categorySlug),
    lookupId(supabase, "authors", authorSlug),
  ]);

  const payload: Partial<ArticleRow> = {
    slug,
    title,
    subtitle: str(formData, "subtitle") || null,
    excerpt,
    body_html: bodyHtml,
    body_markdown: markdown || null,
    category_id: categoryId,
    author_id: authorId,
    updated_by: user.id,
    featured_image_url: str(formData, "featured_image_url") || null,
    featured_image_alt: str(formData, "featured_image_alt"),
    featured_image_caption: str(formData, "featured_image_caption") || null,
    seo_title: str(formData, "seo_title") || null,
    meta_description: str(formData, "meta_description") || null,
    reading_minutes: readingMinutesFor(bodyHtml),
    word_count: countWords(plain),
    region: (str(formData, "region") || null) as ArticleRow["region"],
    is_featured: bool(formData, "is_featured"),
    is_breaking: bool(formData, "is_breaking"),
    is_trending: bool(formData, "is_trending"),
    notify_subscribers: bool(formData, "notify_subscribers"),
  };

  if (status) payload.status = status;

  /*
   * `scheduled_for` is only meaningful while status is 'scheduled', but it
   * must not be cleared by an unrelated edit. Hitting Save on a scheduled
   * article used to null the date while leaving the status alone, which
   * stranded it forever — publish_due_articles() only matches rows with a
   * non-null due time.
   */
  if (status === "scheduled") {
    payload.scheduled_for = scheduledFor!.toISOString();
  } else if (status) {
    // An explicit move to draft / published / archived retires the schedule.
    payload.scheduled_for = null;
  } else if (existingStatus === "scheduled") {
    if (scheduledFor && !Number.isNaN(+scheduledFor)) {
      // Plain save on a scheduled article: honour any edit to the time.
      payload.scheduled_for = scheduledFor.toISOString();
    } else if (scheduleFieldPresent) {
      // The editor cleared the date. Rather than leave it scheduled with no
      // date — invisible and unpublishable — put it back in drafts.
      payload.status = "draft";
      payload.scheduled_for = null;
    }
  } else if (scheduleFieldPresent && !scheduledFor) {
    payload.scheduled_for = null;
  }

  // Publishing an article that was previously live keeps its original date;
  // the DB trigger stamps published_at the first time only.
  if (status === "draft" || status === "archived") {
    payload.published_at = null;
  }

  let articleId = id;

  if (id) {
    const { error } = await supabase.from("articles").update(payload).eq("id", id);
    if (error) return fail(friendlyDbError(error.message));
  } else {
    payload.created_by = user.id;
    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return fail(friendlyDbError(error?.message ?? "Could not create article."));
    articleId = data.id;
  }

  await syncTags(supabase, articleId, str(formData, "tags"));

  refreshPublicSite();
  revalidatePath("/admin/articles");

  // --- Optional subscriber announcement ------------------------------------
  let emailNote = "";
  if (status === "published" && bool(formData, "notify_subscribers")) {
    emailNote = " " + (await announceIfUnsent(articleId, user.id)).message;
  }

  if (!id) {
    // First save of a new article: move to its permanent edit URL.
    redirect(`/admin/articles/${articleId}?saved=1`);
  }

  const verb =
    status === "published"
      ? "Published"
      : status === "scheduled"
        ? `Scheduled for ${scheduledFor?.toLocaleString()}`
        : status === "archived"
          ? "Archived"
          : status === "draft"
            ? "Moved to drafts"
            : "Saved";

  return ok(`${verb}.${emailNote}`, { articleId });
}

// ---------------------------------------------------------------------------
// Status shortcuts used by the article list
// ---------------------------------------------------------------------------

export async function setArticleStatus(
  articleId: string,
  status: ArticleStatus
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return fail("Not signed in.");
  if ((status === "published" || status === "scheduled") && !canPublish(user.profile.role)) {
    return fail("Only editors and administrators can publish.");
  }

  const supabase = await createServerSupabase();
  if (!supabase) return fail("Supabase is not configured.");

  const patch: Partial<ArticleRow> = { status, updated_by: user.id };
  if (status === "draft" || status === "archived") patch.published_at = null;
  if (status !== "scheduled") patch.scheduled_for = null;

  const { error } = await supabase.from("articles").update(patch).eq("id", articleId);
  if (error) return fail(friendlyDbError(error.message));

  refreshPublicSite();
  revalidatePath("/admin/articles");
  return ok(status === "published" ? "Published." : `Moved to ${status}.`);
}

export async function deleteArticle(articleId: string): Promise<ActionState> {
  const supabase = await createServerSupabase();
  if (!supabase) return fail("Supabase is not configured.");

  const { error } = await supabase.from("articles").delete().eq("id", articleId);
  if (error) return fail(friendlyDbError(error.message));

  refreshPublicSite();
  revalidatePath("/admin/articles");
  return ok("Article deleted.");
}

/** Form-action wrappers so buttons in the list can post without JS. */
export async function setArticleStatusForm(formData: FormData) {
  await setArticleStatus(
    String(formData.get("id")),
    String(formData.get("status")) as ArticleStatus
  );
}

export async function deleteArticleForm(formData: FormData) {
  await deleteArticle(String(formData.get("id")));
  redirect("/admin/articles?deleted=1");
}

// ---------------------------------------------------------------------------
// Newsletter announcement
// ---------------------------------------------------------------------------

/**
 * Sends the announcement for an article, unless one already went out.
 * `notified_at` is the guard — set it before the send so a double-submit or a
 * retried request can't produce two blasts.
 */
async function announceIfUnsent(articleId: string, userId: string) {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { data: article } = await supabase
    .from("articles")
    .select(
      `id, slug, title, excerpt, published_at, notified_at, reading_minutes,
       featured_image_url, featured_image_alt,
       category:categories(slug, name),
       author:authors(name)`
    )
    .eq("id", articleId)
    .single();

  if (!article) return { ok: false, message: "Article not found." };
  if (article.notified_at) {
    return { ok: true, message: "Subscribers were already notified about this article." };
  }

  const category = article.category as unknown as { slug: string; name: string } | null;
  const author = article.author as unknown as { name: string } | null;

  await supabase.from("articles").update({ notified_at: new Date().toISOString() }).eq("id", articleId);

  const result = await sendArticleAnnouncement({
    articleId: article.id,
    sentBy: userId,
    title: article.title,
    excerpt: article.excerpt,
    url: `${emailConfig.siteUrl}/article/${category?.slug ?? "local-news"}/${article.slug}`,
    imageUrl: article.featured_image_url,
    imageAlt: article.featured_image_alt ?? article.title,
    authorName: author?.name ?? null,
    publishedAt: article.published_at ?? new Date().toISOString(),
    categoryName: category?.name ?? null,
    readingMinutes: article.reading_minutes ?? undefined,
  });

  // Nothing actually went out — clear the guard so it can be retried.
  if (!result.ok && result.sent === 0) {
    await supabase.from("articles").update({ notified_at: null }).eq("id", articleId);
  }

  return result;
}

/** "Send announcement now" button on the edit screen. */
export async function sendAnnouncementForm(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canPublish(user.profile.role)) return;
  const id = String(formData.get("id"));
  const result = await announceIfUnsent(id, user.id);
  redirect(`/admin/articles/${id}?notice=${encodeURIComponent(result.message)}`);
}

// ---------------------------------------------------------------------------
// Team management (admin only)
// ---------------------------------------------------------------------------

export async function inviteTeamMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") return fail("Administrators only.");

  const supabase = await createServerSupabase();
  if (!supabase) return fail("Supabase is not configured.");

  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role") as UserRole;

  if (!email.includes("@")) return fail("Enter a valid email address.", { email: "Invalid email." });
  if (!["admin", "editor", "contributor", "reader"].includes(role)) {
    return fail("Pick a role.");
  }

  const { error } = await supabase
    .from("admin_allowlist")
    .upsert({ email, role, invited_by: user.id }, { onConflict: "email" });
  if (error) return fail(friendlyDbError(error.message));

  // If they already have an account, apply the new role immediately.
  await supabase.from("profiles").update({ role }).eq("email", email);

  revalidatePath("/admin/team");
  return ok(
    `${email} can now sign in as ${role}. Send them to ${emailConfig.siteUrl}/login — they'll get a magic link.`
  );
}

export async function updateTeamRoleForm(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") return;

  const supabase = await createServerSupabase();
  if (!supabase) return;

  const email = String(formData.get("email")).toLowerCase();
  const role = String(formData.get("role")) as UserRole;

  // Don't let an admin strip their own access and lock the newsroom out.
  if (email === user.email.toLowerCase() && role !== "admin") {
    redirect("/admin/team?notice=" + encodeURIComponent("You can't change your own role."));
  }

  await supabase.from("admin_allowlist").update({ role }).eq("email", email);
  await supabase.from("profiles").update({ role }).eq("email", email);
  revalidatePath("/admin/team");
}

export async function revokeTeamMemberForm(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") return;

  const supabase = await createServerSupabase();
  if (!supabase) return;

  const email = String(formData.get("email")).toLowerCase();
  if (email === user.email.toLowerCase()) {
    redirect("/admin/team?notice=" + encodeURIComponent("You can't revoke your own access."));
  }

  await supabase.from("admin_allowlist").delete().eq("email", email);
  await supabase.from("profiles").update({ role: "reader" }).eq("email", email);
  revalidatePath("/admin/team");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Supa = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

async function lookupId(
  supabase: Supa,
  table: "categories" | "authors",
  slug: string
): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

/** Appends -2, -3, … until the slug is free. */
async function ensureUniqueSlug(
  supabase: Supa,
  base: string,
  currentId: string | null
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === currentId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Replaces an article's tags with the comma-separated list from the form. */
async function syncTags(supabase: Supa, articleId: string, raw: string) {
  const names = Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  );

  await supabase.from("article_tags").delete().eq("article_id", articleId);
  if (names.length === 0) return;

  const rows = names.map((name) => ({ slug: slugify(name), name }));
  const { data: tags } = await supabase
    .from("tags")
    .upsert(rows, { onConflict: "slug" })
    .select("id");

  if (!tags?.length) return;
  await supabase
    .from("article_tags")
    .insert(tags.map((t) => ({ article_id: articleId, tag_id: t.id })));
}

/** Turns Postgres errors into something an editor can act on. */
function friendlyDbError(message: string): string {
  if (message.includes("Only administrators and editors can publish")) {
    return "Only editors and administrators can publish. Your draft was not changed.";
  }
  if (message.includes("duplicate key") && message.includes("slug")) {
    return "Another article already uses that URL slug. Try a different one.";
  }
  if (message.includes("row-level security")) {
    return "You don't have permission to make that change.";
  }
  return message;
}
