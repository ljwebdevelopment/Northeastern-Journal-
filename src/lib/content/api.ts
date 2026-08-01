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
  fetchAuthorSubscriberCount,
  fetchAuthors,
  fetchCategories,
  fetchPublishedArticles,
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

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return resolved(
    (await allArticlesMerged()).filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.body.join(" ").toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    )
  );
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
// Still served from the placeholder dataset. Each has a Supabase table waiting
// in the roadmap; wiring one up means adding a fetch here, exactly as the
// article functions above do.

export async function getBooks(): Promise<Book[]> {
  return byDateDesc(allBooks);
}

export async function getBookBySlug(slug: string): Promise<Book | undefined> {
  return allBooks.find((b) => b.slug === slug);
}

export async function getVideos(): Promise<Video[]> {
  return byDateDesc(allVideos);
}

export async function getVideoBySlug(slug: string): Promise<Video | undefined> {
  return allVideos.find((v) => v.slug === slug);
}

export async function getConversations(): Promise<Conversation[]> {
  return byDateDesc(allConversations);
}

export async function getConversationBySlug(slug: string): Promise<Conversation | undefined> {
  return allConversations.find((c) => c.slug === slug);
}

export async function getNewsletterIssues(): Promise<NewsletterIssue[]> {
  return byDateDesc(allNewsletterIssues);
}

export async function getNewsletterIssueBySlug(
  slug: string
): Promise<NewsletterIssue | undefined> {
  return allNewsletterIssues.find((n) => n.slug === slug);
}
