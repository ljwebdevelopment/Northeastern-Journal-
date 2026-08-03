/**
 * Data access boundary. Every page and component goes through these functions
 * rather than importing a data source directly.
 *
 * Two sources feed it:
 *
 *   1. **Supabase** — everything editors publish from /admin. Marked
 *      `isDemo: false`.
 *   2. **`data.ts`** — the built-in placeholder archive shipped with the
 *      rebuild. Marked `isDemo: true`.
 *
 * They are merged and passed through `resolveContent`, which drops the
 * placeholders from any listing that has at least one real article. So the
 * site looks complete on day one, and each real story published quietly
 * replaces showcase content — no flag to flip, no code change. Once the
 * archive is fully populated the placeholders disappear on their own.
 */
import { cache } from "react";
import {
  articles as placeholderArticles,
  authors as placeholderAuthors,
  books as allBooks,
  categories as placeholderCategories,
  conversations as allConversations,
  newsletterIssues as allNewsletterIssues,
  videos as allVideos,
} from "./data";
import { resolveContent } from "./demo-config";
import {
  fetchArticleSearch,
  fetchAuthorSubscriberCount,
  fetchAuthors,
  fetchBooks,
  fetchCategories,
  fetchConversations,
  fetchNewsletterIssues,
  fetchPublishedArticles,
  fetchVideos,
} from "./supabase-source";
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

const byDateDesc = <T extends { publishedAt: string }>(items: T[]) =>
  [...items].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

/** Lets real articles supersede placeholders, then sorts newest-first. */
const resolved = (items: Article[]) => byDateDesc(resolveContent(items));

// --- Pagination -------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export const DEFAULT_PER_PAGE = 12;

/**
 * Slices a resolved list into a page.
 *
 * Paging happens here rather than in SQL because a listing is two sources
 * merged — the live archive and the built-in placeholder archive, with the
 * former superseding the latter. `LIMIT 12` against Supabase would page
 * through only half the data and produce short or duplicated pages as the
 * placeholders retire. The upstream fetch is capped (500 articles), so the
 * merged array is bounded and this stays cheap; when the archive outgrows that
 * cap, the placeholders will long since have been superseded, and the fetch
 * can move to a real SQL LIMIT/OFFSET with no change to callers.
 */
export function paginate<T>(items: T[], page = 1, perPage = DEFAULT_PER_PAGE): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  // Clamp rather than 404: a stale link to page 9 of a shrinking archive
  // should land on the last page, not on an error.
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    total,
    page: current,
    perPage,
    pageCount,
  };
}

/*
 * `cache()` deduplicates these within a single render pass, so a page that
 * asks for featured + trending + most-read articles hits Supabase once.
 */

const allArticlesMerged = cache(async (): Promise<Article[]> => {
  const live = await fetchPublishedArticles();
  return [...live, ...placeholderArticles];
});

const allAuthorsMerged = cache(async (): Promise<Author[]> => {
  const live = await fetchAuthors();
  if (live.length === 0) return placeholderAuthors;
  // Live authors win on slug collisions; placeholder bylines stay visible
  // so their historical articles still resolve to a profile.
  const seen = new Set(live.map((a) => a.slug));
  return [...live, ...placeholderAuthors.filter((a) => !seen.has(a.slug))];
});

const allCategoriesMerged = cache(async (): Promise<Category[]> => {
  const live = await fetchCategories();
  return live.length > 0 ? live : placeholderCategories;
});

// --- Categories -------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  return allCategoriesMerged();
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await allCategoriesMerged()).find((c) => c.slug === slug);
}

// --- Articles ---------------------------------------------------------------

export async function getArticles(): Promise<Article[]> {
  return resolved(await allArticlesMerged());
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const all = await allArticlesMerged();
  // Prefer a real article over a placeholder if both somehow share a slug.
  return all.find((a) => a.slug === slug && !a.isDemo) ?? all.find((a) => a.slug === slug);
}

export async function getArticlesByCategory(category: CategorySlug): Promise<Article[]> {
  return resolved((await allArticlesMerged()).filter((a) => a.category === category));
}

export async function getArticlesByAuthor(authorSlug: string): Promise<Article[]> {
  return resolved((await allArticlesMerged()).filter((a) => a.authorSlug === authorSlug));
}

export async function getArticlesByRegion(
  region: "local" | "national" | "world"
): Promise<Article[]> {
  return resolved((await allArticlesMerged()).filter((a) => a.region === region));
}

export async function getFeaturedArticles(): Promise<Article[]> {
  return resolved((await allArticlesMerged()).filter((a) => a.featured));
}

export async function getTrendingArticles(): Promise<Article[]> {
  return resolved((await allArticlesMerged()).filter((a) => a.trending));
}

export async function getMostReadArticles(): Promise<Article[]> {
  const all = await allArticlesMerged();
  const flagged = resolved(all.filter((a) => a.mostRead));
  // Real articles don't carry a hand-set "most read" flag; fall back to the
  // newest live stories so the rail is never empty once placeholders retire.
  if (flagged.length > 0) return flagged;
  return resolved(all).slice(0, 5);
}

export async function getBreakingArticles(): Promise<Article[]> {
  return resolved((await allArticlesMerged()).filter((a) => a.breaking));
}

export async function getOpinionArticles(): Promise<Article[]> {
  return getArticlesByCategory("opinion");
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const all = await allArticlesMerged();

  const sameCategory = all.filter(
    (a) => a.slug !== article.slug && a.category === article.category
  );
  const sameAuthor = all.filter(
    (a) =>
      a.slug !== article.slug &&
      a.authorSlug === article.authorSlug &&
      a.category !== article.category
  );
  const sharedTag = all.filter(
    (a) =>
      a.slug !== article.slug &&
      a.category !== article.category &&
      a.authorSlug !== article.authorSlug &&
      a.tags.some((t) => article.tags.includes(t))
  );

  // Category first, then the same byline, then anything sharing a tag.
  const ordered = [...resolved(sameCategory), ...resolved(sameAuthor), ...resolved(sharedTag)];
  const seen = new Set<string>();
  return ordered
    .filter((a) => (seen.has(a.slug) ? false : seen.add(a.slug)))
    .slice(0, limit);
}

/**
 * Site search.
 *
 * Postgres does the matching for live articles — stemming, stop words, phrase
 * handling, and a GIN index instead of a scan over every body. The built-in
 * placeholder archive has no row in Postgres, so it is matched here on the
 * same terms, and both sets are then ranked by one rule so a placeholder and a
 * real article can be ordered against each other honestly.
 *
 * Ranking is deliberately simple and explainable: where the words appear
 * (headline beats body), how many of them appear, and recency as the
 * tie-break. For a newsroom archive, "relevant and recent" is the answer
 * people actually want.
 */
export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim();
  if (!q) return [];

  const terms = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const [live, placeholders] = await Promise.all([
    fetchArticleSearch(q),
    Promise.resolve(placeholderArticles.filter((a) => scoreArticle(a, terms) > 0)),
  ]);

  // resolveContent still decides whether placeholders belong in the result at
  // all; ranking only reorders whatever survives it.
  const merged = resolveContent([...live, ...placeholders]);

  return merged
    .map((article) => ({ article, score: scoreArticle(article, terms) }))
    // A live match may score zero here — Postgres stems ("running" matches
    // "run") where this does not. Keep it: the database said it matched.
    .sort(
      (a, b) =>
        b.score - a.score ||
        +new Date(b.article.publishedAt) - +new Date(a.article.publishedAt)
    )
    .map((r) => r.article);
}

/** Weighted term hits: headline 6, summary 3, tag 3, body 1. */
function scoreArticle(article: Article, terms: string[]): number {
  if (terms.length === 0) return 0;

  const title = article.title.toLowerCase();
  const summary = `${article.subtitle ?? ""} ${article.excerpt}`.toLowerCase();
  const tags = article.tags.join(" ").toLowerCase();
  const body = article.body.join(" ").toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 6;
    if (summary.includes(term)) score += 3;
    if (tags.includes(term)) score += 3;
    if (body.includes(term)) score += 1;
  }
  return score;
}

// --- Tags -------------------------------------------------------------------

export interface TagSummary {
  slug: string;
  count: number;
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  const needle = tag.toLowerCase();
  return resolved((await allArticlesMerged()).filter((a) => a.tags.some((t) => t.toLowerCase() === needle)));
}

/** Every tag in use, most-used first. Drives the tag index page. */
export async function getTags(): Promise<TagSummary[]> {
  const counts = new Map<string, number>();
  for (const article of resolved(await allArticlesMerged())) {
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

// --- Authors ----------------------------------------------------------------

export async function getAuthors(): Promise<Author[]> {
  return allAuthorsMerged();
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  const authors = await allAuthorsMerged();
  const bySlug = authors.find((a) => a.slug === slug);
  if (bySlug) return bySlug;

  // Fall back to the author's chosen handle, so /author/@name and
  // /author/name both reach the profile.
  const handle = slug.replace(/^@/, "").toLowerCase();
  return authors.find((a) => a.username?.toLowerCase() === handle);
}

/** Confirmed subscribers following this journalist. */
export async function getAuthorSubscriberCount(slug: string): Promise<number> {
  return fetchAuthorSubscriberCount(slug);
}

// --- Books, videos, conversations, newsletter --------------------------------
// All four now come from Supabase, edited at /admin/collections. The arrays in
// `data.ts` remain as the empty fallback for a database that isn't reachable
// or hasn't had migration 0012 run against it — the same failure-tolerant
// shape the article functions use, so a section hides rather than erroring.
//
// Ordering is decided in SQL (`sort_order`, then date), so these do not re-sort
// what comes back: an editor who pins a book to the top means it.

const allBooksMerged = cache(async (): Promise<Book[]> => {
  const live = await fetchBooks();
  return live.length > 0 ? live : byDateDesc(allBooks);
});

const allVideosMerged = cache(async (): Promise<Video[]> => {
  const live = await fetchVideos();
  return live.length > 0 ? live : byDateDesc(allVideos);
});

const allConversationsMerged = cache(async (): Promise<Conversation[]> => {
  const live = await fetchConversations();
  return live.length > 0 ? live : byDateDesc(allConversations);
});

const allIssuesMerged = cache(async (): Promise<NewsletterIssue[]> => {
  const live = await fetchNewsletterIssues();
  return live.length > 0 ? live : byDateDesc(allNewsletterIssues);
});

export async function getBooks(): Promise<Book[]> {
  return allBooksMerged();
}

export async function getBookBySlug(slug: string): Promise<Book | undefined> {
  return (await allBooksMerged()).find((b) => b.slug === slug);
}

export async function getVideos(): Promise<Video[]> {
  return allVideosMerged();
}

export async function getVideoBySlug(slug: string): Promise<Video | undefined> {
  return (await allVideosMerged()).find((v) => v.slug === slug);
}

export async function getConversations(): Promise<Conversation[]> {
  return allConversationsMerged();
}

export async function getConversationBySlug(slug: string): Promise<Conversation | undefined> {
  return (await allConversationsMerged()).find((c) => c.slug === slug);
}

export async function getNewsletterIssues(): Promise<NewsletterIssue[]> {
  return allIssuesMerged();
}

export async function getNewsletterIssueBySlug(
  slug: string
): Promise<NewsletterIssue | undefined> {
  return (await allIssuesMerged()).find((n) => n.slug === slug);
}
