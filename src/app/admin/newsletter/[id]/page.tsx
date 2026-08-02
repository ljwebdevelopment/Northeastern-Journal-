import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser, isStaff } from "@/lib/auth/roles";
import { isResendConfigured } from "@/lib/email/resend";
import { fetchPickableArticles } from "@/lib/newsletter/issue";
import { NewsletterComposer, type CandidateArticle } from "@/components/admin/newsletter-composer";
import { deleteIssueForm, sendIssueForm, sendTestForm } from "../actions";
import type { NewsletterIssueRow } from "@/lib/supabase/types";

export const metadata = { title: "Compose issue" };

export default async function ComposeIssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.profile.role)) redirect("/admin?error=admin-only");

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { id } = await params;
  const { notice } = await searchParams;

  const { data: row } = await supabase
    .from("newsletter_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();
  const issue = row as NewsletterIssueRow;

  const [articles, lastSent, subscriberCount] = await Promise.all([
    fetchPickableArticles(supabase),
    supabase
      .from("newsletter_issues")
      .select("sent_at")
      .eq("status", "sent")
      .neq("id", id)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r.data?.sent_at ?? null),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .then((r) => r.count ?? 0),
  ]);

  const candidates: CandidateArticle[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    categoryName: a.category?.name ?? null,
    authorName: a.author?.name ?? null,
    publishedAt: a.published_at ?? a.created_at,
    viewCount: a.view_count ?? 0,
    isTrending: a.is_trending,
    // "New" is measured against the previous issue, so a skipped week still
    // picks up everything published in the gap.
    isNew: Boolean(lastSent && a.published_at && a.published_at >= lastSent),
  }));

  return (
    <NewsletterComposer
      issue={{
        id: issue.id,
        issueNumber: issue.issue_number,
        slug: issue.slug,
        title: issue.title,
        summary: issue.summary,
        intro: issue.intro,
        status: issue.status,
        leadId: issue.lead_article_id ?? "",
        latestIds: issue.latest_ids,
        trendingIds: issue.trending_ids,
        sentAt: issue.sent_at,
        succeeded: issue.succeeded,
        failed: issue.failed,
      }}
      candidates={candidates}
      subscriberCount={subscriberCount}
      emailReady={isResendConfigured}
      editorEmail={user.email}
      sendTestAction={sendTestForm}
      sendAction={sendIssueForm}
      deleteAction={deleteIssueForm}
      notice={notice}
    />
  );
}
