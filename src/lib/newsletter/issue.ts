import "server-only";

import { emailConfig } from "@/lib/email/resend";
import type { NewsletterIssueView, NewsletterItemView } from "@/lib/email/templates";
import type {
  NewsletterIssueRow,
  NewsletterItem,
  NewsletterSnapshot,
} from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Turning a stored issue into something renderable.
 *
 * A draft holds article *ids* and resolves them live, so a headline corrected
 * on Saturday shows corrected in Sunday's preview. A sent issue holds a
 * `snapshot` and renders from that instead — the archive must keep showing what
 * subscribers actually received, whatever happens to the articles afterwards.
 *
 * Both paths end at the same `NewsletterSnapshot`, so the email template and
 * the public archive page never need to know which kind of issue they have.
 */

type Supa = SupabaseClient<Database>;

/** How far back "trending" looks when suggesting content. */
const TRENDING_WINDOW_DAYS = 30;
/** Fallback window for a first issue, when there's no previous send to date from. */
const FIRST_ISSUE_WINDOW_DAYS = 7;

const MAX_LATEST = 6;
const MAX_TRENDING = 5;

const ARTICLE_SELECT = `
  id, slug, title, excerpt, published_at, created_at, reading_minutes, view_count,
  featured_image_url, featured_image_alt, is_featured, is_trending,
  category:categories(slug, name),
  author:authors(name)
`;

/** The shape the select above returns. Supabase types the joins loosely. */
export interface PickableArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  reading_minutes: number | null;
  view_count: number | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  is_featured: boolean;
  is_trending: boolean;
  category: { slug: string; name: string } | null;
  author: { name: string } | null;
}

export function articleUrl(categorySlug: string | undefined, slug: string): string {
  return `${emailConfig.siteUrl}/article/${categorySlug ?? "local-news"}/${slug}`;
}

export function toNewsletterItem(row: PickableArticle): NewsletterItem {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    url: articleUrl(row.category?.slug, row.slug),
    imageUrl: row.featured_image_url,
    imageAlt: row.featured_image_alt || row.title,
    categoryName: row.category?.name ?? null,
    authorName: row.author?.name ?? null,
    publishedAt: row.published_at ?? new Date().toISOString(),
    readingMinutes: row.reading_minutes,
    viewCount: row.view_count,
  };
}

/**
 * Every published article an editor can choose from, newest first.
 *
 * Capped rather than paginated: an issue is assembled from recent work, and a
 * list long enough to need paging is a list nobody reads through.
 */
export async function fetchPickableArticles(
  supabase: Supa,
  limit = 60
): Promise<PickableArticle[]> {
  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as PickableArticle[];
}

/**
 * What the next issue should probably contain.
 *
 * "New" means published since the last issue went out, so nothing is ever sent
 * twice and nothing is skipped when a week is missed. Trending is measured over
 * a rolling month by read count, with the editorial `is_trending` flag winning
 * ties — the newsroom's judgement beats the numbers where they disagree.
 */
export async function suggestIssueContent(supabase: Supa): Promise<{
  leadId: string | null;
  latestIds: string[];
  trendingIds: string[];
  since: string;
}> {
  const { data: lastSent } = await supabase
    .from("newsletter_issues")
    .select("sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since =
    lastSent?.sent_at ??
    new Date(Date.now() - FIRST_ISSUE_WINDOW_DAYS * 86_400_000).toISOString();

  const articles = await fetchPickableArticles(supabase);
  const published = articles.filter((a) => a.published_at);

  const fresh = published.filter((a) => a.published_at! >= since);

  // The lead is the newsroom's pick if there is one, otherwise the most-read of
  // the new work, otherwise simply the newest thing there is.
  const lead =
    fresh.find((a) => a.is_featured) ??
    [...fresh].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))[0] ??
    published[0] ??
    null;

  const latestIds = fresh
    .filter((a) => a.id !== lead?.id)
    .slice(0, MAX_LATEST)
    .map((a) => a.id);

  const trendingCutoff = new Date(
    Date.now() - TRENDING_WINDOW_DAYS * 86_400_000
  ).toISOString();

  const trendingIds = published
    .filter((a) => a.published_at! >= trendingCutoff && a.id !== lead?.id)
    .sort((a, b) => {
      if (a.is_trending !== b.is_trending) return a.is_trending ? -1 : 1;
      return (b.view_count ?? 0) - (a.view_count ?? 0);
    })
    .slice(0, MAX_TRENDING)
    .map((a) => a.id);

  return { leadId: lead?.id ?? null, latestIds, trendingIds, since };
}

/**
 * Resolves an issue's selections into the items that will render.
 *
 * Sent issues short-circuit to their snapshot. For drafts, ids that no longer
 * resolve — an article deleted or pulled back to draft since it was picked —
 * are dropped silently rather than rendering a broken row; the composer shows
 * the editor which selections survived.
 */
export async function resolveIssue(
  supabase: Supa,
  issue: NewsletterIssueRow
): Promise<NewsletterSnapshot> {
  if (issue.status === "sent" && issue.snapshot) return issue.snapshot;

  const ids = [
    ...(issue.lead_article_id ? [issue.lead_article_id] : []),
    ...issue.latest_ids,
    ...issue.trending_ids,
  ];
  if (ids.length === 0) return { lead: null, latest: [], trending: [] };

  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .in("id", Array.from(new Set(ids)))
    .eq("status", "published");

  const byId = new Map(
    ((data ?? []) as unknown as PickableArticle[]).map((row) => [row.id, toNewsletterItem(row)])
  );

  // Map through the stored id order, not the order Postgres returned them in.
  const pick = (list: string[]) =>
    list.map((id) => byId.get(id)).filter((item): item is NewsletterItem => Boolean(item));

  return {
    lead: (issue.lead_article_id && byId.get(issue.lead_article_id)) || null,
    latest: pick(issue.latest_ids),
    trending: pick(issue.trending_ids),
  };
}

/** The email template's input, assembled from a row and its resolved items. */
export function issueView(
  issue: NewsletterIssueRow,
  snapshot: NewsletterSnapshot
): NewsletterIssueView {
  return {
    issueNumber: issue.issue_number,
    title: issue.title,
    intro: issue.intro,
    summary: issue.summary,
    // A draft has no send date yet; dating the preview "today" is what an
    // editor is checking against anyway.
    sentAt: issue.sent_at ?? new Date().toISOString(),
    lead: snapshot.lead as NewsletterItemView | null,
    latest: snapshot.latest as NewsletterItemView[],
    trending: snapshot.trending as NewsletterItemView[],
  };
}
