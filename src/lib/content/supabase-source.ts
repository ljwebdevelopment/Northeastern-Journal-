import "server-only";

import { createPublicSupabase } from "@/lib/supabase/server";
import type {
  ArticleWithRelations,
  AuthorRow,
  BookRow,
  CategoryRow,
  ConversationRow,
  ConversationTurn,
  NewsletterIssueRow,
  VideoRow,
} from "@/lib/supabase/types";
import { htmlToParagraphs } from "@/lib/richtext";
import type {
  Article,
  Author,
  Book,
  Category,
  CategorySlug,
  Conversation,
  NewsletterIssue,
  Video,
} from "./types";
import { categories as fallbackCategories } from "./data";

/**
 * Reads published content out of Supabase and maps it onto the app's domain
 * types — articles, bylines, sections, and the four collections (books,
 * videos, conversations, newsletter issues).
 *
 * Every function is failure-tolerant: if Supabase is unreachable, unconfigured,
 * or missing a migration, it returns an empty array. `api.ts` then serves the
 * (now empty) fallback arrays from `data.ts`, and the affected section hides
 * itself rather than showing an error page.
 */

const ARTICLE_SELECT = `
  id, slug, title, subtitle, excerpt, body_html, status, published_at, updated_at,
  featured_image_url, featured_image_alt, featured_image_caption,
  seo_title, meta_description, canonical_url,
  reading_minutes, word_count, region, view_count,
  is_featured, is_breaking, is_trending,
  category:categories(slug, name),
  author:authors(slug, name, role, photo_url, bio),
  article_tags(tag:tags(slug, name))
`;

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

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(500);

  if (error || !data) {
    if (error) console.error("[content] failed to load articles:", error.message);
    return [];
  }
  return (data as unknown as ArticleWithRelations[]).map(mapArticle);
}

/**
 * Articles matching a search, found by Postgres.
 *
 * `websearch` is the parser that behaves the way people already expect from a
 * search box: bare words are ANDed, "a phrase" in quotes stays together, and a
 * leading `-` excludes. It also can't throw on malformed input, unlike the
 * `plainto`/`to_tsquery` family — a stray parenthesis from a reader is a
 * no-match, not a 500.
 *
 * Matching happens in Postgres against the GIN index; ranking happens in
 * `api.ts`, because results from the live archive and the placeholder archive
 * have to be ordered against each other by the same rule.
 */
export async function fetchArticleSearch(query: string, limit = 200): Promise<Article[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const live = supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());

  const { data, error } = await live
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!error && data) {
    return (data as unknown as ArticleWithRelations[]).map(mapArticle);
  }

  /*
   * `search_vector` arrives with migration 0011. Until that has been run
   * against the database — a fresh deploy, or an upgrade where the SQL hasn't
   * been applied yet — the column genuinely isn't there, and returning nothing
   * would make the site look like it has no archive at all.
   *
   * So fall back to a headline-and-summary LIKE. It is the old behaviour,
   * minus the full-body scan: worse than the index, far better than an empty
   * page, and it disappears on its own the moment the migration lands.
   */
  const missingColumn = error?.message.includes("search_vector");
  if (!missingColumn) {
    console.error("[content] search failed:", error?.message);
    return [];
  }
  console.warn(
    "[content] falling back to basic search — run migration 0011 to enable full-text search."
  );

  const like = query.replace(/[%_,]/g, " ").trim();
  if (!like) return [];

  const { data: rough } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .or(`title.ilike.%${like}%,excerpt.ilike.%${like}%,subtitle.ilike.%${like}%`)
    .order("published_at", { ascending: false })
    .limit(limit);

  return ((rough ?? []) as unknown as ArticleWithRelations[]).map(mapArticle);
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

// ---------------------------------------------------------------------------
// Collections: books, videos, conversations, newsletter issues
// ---------------------------------------------------------------------------
// Each is one query with no joins beyond a slug lookup, and each returns an
// empty array on failure so a missing table (migration 0012 not yet run) hides
// the section rather than breaking the page that lists it.

const PUBLISHED = <T>(rows: T[] | null) => rows ?? [];

/**
 * Reports a collection query that failed, without shouting about a migration
 * that simply hasn't been run yet.
 *
 * A missing table or column is a setup step, not a fault, and logging it as an
 * error once per collection per page render buries the failures that do need
 * attention. Anything else is a real error and is logged as one.
 */
function reportCollectionError(what: string, message: string) {
  const notMigrated =
    message.includes("does not exist") || message.includes("schema cache");

  if (notMigrated) {
    console.warn(`[content] ${what} unavailable — run migration 0012_collections.sql.`);
  } else {
    console.error(`[content] failed to load ${what}:`, message);
  }
}

export async function fetchBooks(): Promise<Book[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("books")
    .select("*, author:authors(slug)")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("sort_order")
    .order("published_at", { ascending: false });

  if (error) {
    reportCollectionError("books", error.message);
    return [];
  }

  return PUBLISHED(data as unknown as (BookRow & { author: { slug: string } | null })[]).map(
    (row) => ({
      slug: row.slug,
      title: row.title,
      authorSlug: row.author?.slug ?? "",
      cover: row.cover_url ?? PLACEHOLDER_IMAGE,
      synopsis: row.synopsis,
      reviewExcerpt: row.review_excerpt,
      buyUrl: row.buy_url ?? "",
      publishedAt: row.published_at,
      readingGuideUrl: row.reading_guide_url ?? undefined,
    })
  );
}

export async function fetchVideos(): Promise<Video[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("videos")
    .select("*, category:categories(slug)")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("sort_order")
    .order("published_at", { ascending: false });

  if (error) {
    reportCollectionError("videos", error.message);
    return [];
  }

  return PUBLISHED(
    data as unknown as (VideoRow & { category: { slug: string } | null })[]
  ).map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    youtubeId: row.youtube_id,
    // YouTube serves a thumbnail for every video, so an editor who didn't
    // upload one still gets a picture rather than a grey box.
    thumbnail: row.thumbnail_url || `https://i.ytimg.com/vi/${row.youtube_id}/hqdefault.jpg`,
    category: asCategorySlug(row.category?.slug),
    publishedAt: row.published_at,
    playlist: row.playlist ?? undefined,
  }));
}

export async function fetchConversations(): Promise<Conversation[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("sort_order")
    .order("published_at", { ascending: false });

  if (error) {
    reportCollectionError("conversations", error.message);
    return [];
  }

  return PUBLISHED(data as unknown as ConversationRow[]).map((row) => ({
    slug: row.slug,
    title: row.title,
    format: row.format,
    participants: row.participants ?? [],
    excerpt: row.excerpt,
    // JSONB is `unknown` as far as the type system is concerned, and this is
    // rendered as text, so drop anything that isn't a well-formed turn rather
    // than trusting the column's shape.
    body: Array.isArray(row.body)
      ? (row.body as ConversationTurn[]).filter(
          (turn) => turn && typeof turn.speaker === "string" && typeof turn.text === "string"
        )
      : [],
    publishedAt: row.published_at,
    image: row.image_url ?? PLACEHOLDER_IMAGE,
  }));
}

export async function fetchNewsletterIssues(): Promise<NewsletterIssue[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("newsletter_issues")
    .select("*")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) {
    reportCollectionError("newsletter issues", error.message);
    return [];
  }

  return PUBLISHED(data as unknown as NewsletterIssueRow[]).map((row) => ({
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    publishedAt: row.published_at,
    issueNumber: row.issue_number,
    bodyHtml: row.body_html || undefined,
  }));
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
