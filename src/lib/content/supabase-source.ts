import "server-only";

import { createPublicSupabase } from "@/lib/supabase/server";
import type {
  ArticleWithRelations,
  AuthorRow,
  CategoryRow,
  NewsletterIssueRow,
  NewsletterItem,
  PublicCommentRow,
} from "@/lib/supabase/types";
import { htmlToParagraphs } from "@/lib/richtext";
import type {
  Article,
  Author,
  Category,
  CategorySlug,
  NewsletterIssue,
  NewsletterIssueItem,
} from "./types";
import { categories as fallbackCategories } from "./data";

/**
 * Reads published content out of Supabase and maps it onto the app's domain
 * types. Every function is failure-tolerant: if Supabase is unreachable or
 * unconfigured it returns an empty array, and `api.ts` falls back to the
 * built-in placeholder archive rather than showing an error page.
 */

/**
 * `like_count` arrives with migration 0009. Requesting a column that doesn't
 * exist fails the whole query, which would empty the site of every real
 * article — so it is kept separate and dropped on the retry below. Once the
 * migration has run everywhere, it can be folded into the main list.
 */
const ARTICLE_SELECT_BASE = `
  id, slug, title, subtitle, excerpt, body_html, status, published_at, updated_at,
  featured_image_url, featured_image_alt, featured_image_caption,
  seo_title, meta_description, canonical_url,
  reading_minutes, word_count, region, view_count,
  is_featured, is_breaking, is_trending,
  category:categories(slug, name),
  author:authors(slug, name, role, photo_url, bio),
  article_tags(tag:tags(slug, name))
`;

const ARTICLE_SELECT = `${ARTICLE_SELECT_BASE}, like_count`;

const knownCategorySlugs = new Set(fallbackCategories.map((c) => c.slug));

function asCategorySlug(slug: string | undefined | null): CategorySlug {
  if (slug && knownCategorySlugs.has(slug as CategorySlug)) return slug as CategorySlug;
  // A category added in the CMS that predates the union type still renders;
  // it just doesn't get compile-time narrowing.
  return (slug ?? "local-news") as CategorySlug;
}

const PLACEHOLDER_IMAGE = "/logo-mark.svg";

export function mapArticle(row: ArticleWithRelations): Article {
  const bodyHtml = row.body_html ?? "";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    excerpt: row.excerpt ?? "",
    bodyHtml,
    body: htmlToParagraphs(bodyHtml),
    category: asCategorySlug(row.category?.slug),
    authorSlug: row.author?.slug ?? "",
    publishedAt: row.published_at ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
    image: row.featured_image_url ?? PLACEHOLDER_IMAGE,
    imageAlt: row.featured_image_alt || row.title,
    imageCaption: row.featured_image_caption ?? undefined,
    tags: (row.article_tags ?? [])
      .map((t) => t.tag?.slug)
      .filter((s): s is string => Boolean(s)),
    seoTitle: row.seo_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    canonicalUrl: row.canonical_url ?? undefined,
    readingMinutes: row.reading_minutes ?? undefined,
    wordCount: row.word_count ?? undefined,
    viewCount: row.view_count ?? 0,
    likeCount: row.like_count ?? 0,
    featured: row.is_featured,
    trending: row.is_trending,
    breaking: row.is_breaking,
    mostRead: false,
    region: row.region ?? undefined,
    isDemo: false,
  };
}

export function mapAuthor(row: AuthorRow): Author {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    photo: row.photo_url ?? PLACEHOLDER_IMAGE,
    bio: row.bio,
    longBio: row.long_bio || row.bio,
    social: (row.social ?? {}) as Author["social"],
    relatedTopics: (row.related_topics ?? []).map(asCategorySlug),
    username: row.username ?? undefined,
    location: row.location ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    featuredQuote: row.featured_quote ?? undefined,
    foundingRole: row.founding_role ?? undefined,
    quotes: row.quotes ?? [],
    readingList: row.reading_list ?? [],
    timeline: row.timeline ?? [],
    professionalLinks: row.professional_links ?? [],
    videoPlaylist: row.video_playlist ?? undefined,
    speaking: row.speaking ?? undefined,
    podcastUrl: row.podcast_url ?? undefined,
    showSubscriberCount: row.show_subscriber_count ?? true,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    slug: asCategorySlug(row.slug),
    name: row.name,
    description: row.description,
  };
}

/** Every live article, newest first. Empty array if Supabase is unavailable. */
export async function fetchPublishedArticles(): Promise<Article[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const run = (select: string) =>
    supabase
      .from("articles")
      .select(select)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(500);

  let { data, error } = await run(ARTICLE_SELECT);

  // Migration 0009 hasn't run on this database yet. Retry without the column
  // rather than returning nothing: a missing like count is a cosmetic gap,
  // but an empty article list takes down the whole site.
  if (error && /like_count/.test(error.message)) {
    console.warn("[content] like_count missing — run migration 0009. Serving without likes.");
    ({ data, error } = await run(ARTICLE_SELECT_BASE));
  }

  if (error || !data) {
    if (error) console.error("[content] failed to load articles:", error.message);
    return [];
  }
  return (data as unknown as ArticleWithRelations[]).map(mapArticle);
}

export async function fetchAuthors(): Promise<Author[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !data) return [];
  return data.map(mapAuthor);
}

export async function fetchCategories(): Promise<Category[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  if (error || !data) return [];
  return data.map(mapCategory);
}

/**
 * Sent newsletter issues, newest first, for the public archive.
 *
 * Renders from each issue's `snapshot` — the copy written at send time — not
 * from the article ids it was assembled from. An archived issue is a record of
 * what subscribers received, so it must not drift when an article is later
 * edited or unpublished. Drafts are invisible here: the anon policy on
 * `newsletter_issues` only exposes rows with status 'sent'.
 */
export async function fetchNewsletterIssues(): Promise<NewsletterIssue[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("newsletter_issues")
    .select("slug, title, summary, intro, issue_number, sent_at, snapshot")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data.map(mapNewsletterIssue);
}

const mapNewsletterItem = (item: NewsletterItem): NewsletterIssueItem => ({
  slug: item.slug,
  title: item.title,
  excerpt: item.excerpt,
  url: item.url,
  imageUrl: item.imageUrl ?? undefined,
  imageAlt: item.imageAlt || item.title,
  categoryName: item.categoryName ?? undefined,
  authorName: item.authorName ?? undefined,
  publishedAt: item.publishedAt,
  readingMinutes: item.readingMinutes ?? undefined,
  viewCount: item.viewCount ?? undefined,
});

function mapNewsletterIssue(
  row: Pick<
    NewsletterIssueRow,
    "slug" | "title" | "summary" | "intro" | "issue_number" | "sent_at" | "snapshot"
  >
): NewsletterIssue {
  const snapshot = row.snapshot;
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    intro: row.intro,
    issueNumber: row.issue_number,
    publishedAt: row.sent_at ?? new Date().toISOString(),
    lead: snapshot?.lead ? mapNewsletterItem(snapshot.lead) : null,
    latest: (snapshot?.latest ?? []).map(mapNewsletterItem),
    trending: (snapshot?.trending ?? []).map(mapNewsletterItem),
  };
}

/**
 * How many confirmed subscribers follow this author.
 *
 * Reads through `author_subscriber_count`, a security-definer function that
 * returns a number and never a row — the subscriber list itself stays
 * unreadable to `anon`.
 */
export async function fetchAuthorSubscriberCount(slug: string): Promise<number> {
  const supabase = createPublicSupabase();
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc("author_subscriber_count", {
    author_slug: slug,
  });
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

/** Follower counts for the whole roster, keyed by author slug. */
export async function fetchAuthorSubscriberCounts(): Promise<Record<string, number>> {
  const supabase = createPublicSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc("author_subscriber_counts");
  if (error || !data) return {};

  return Object.fromEntries(
    (data as { author_slug: string; subscribers: number }[]).map((row) => [
      row.author_slug,
      row.subscribers,
    ])
  );
}

/**
 * The public comment thread for an article, oldest first.
 *
 * Reads through `get_article_comments`, which omits `delete_token` and the
 * stored IP/user-agent — so nothing this returns is unsafe to render. Read
 * uncached: a reader who posts a comment should see the thread they just
 * joined, not a snapshot from five minutes ago.
 */
export async function fetchArticleComments(slug: string): Promise<PublicCommentRow[]> {
  const supabase = createPublicSupabase(0);
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_article_comments", {
    article_slug: slug,
  });
  if (error || !data) return [];
  return data;
}
