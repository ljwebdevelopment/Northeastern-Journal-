/**
 * Data access boundary. Every page/component goes through these functions
 * rather than importing `data.ts` directly, so the placeholder dataset can
 * later be swapped for a real CMS client (WordPress, Sanity, Strapi,
 * Contentful, Payload) without touching UI code.
 */
import { getAuthorProfile, listAuthorProfiles } from "@/lib/store/authors";
import { listPublishedArticles, getStoredArticle } from "@/lib/store/articles";
import {
  articles as seededArticles,
  books as allBooks,
  categories as allCategories,
  conversations as allConversations,
  newsletterIssues as allNewsletterIssues,
  videos as allVideos,
} from "./data";
import { resolveContent } from "./demo-config";
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

/**
 * All published articles: whatever the newsroom has written in the
 * dashboard, plus any seeded articles (there are none by default).
 */
async function allArticles(): Promise<Article[]> {
  const stored = await listPublishedArticles();
  return [...seededArticles, ...stored];
}

/** Same as `byDateDesc`, but first lets real articles supersede demo ones. */
const resolved = (items: Article[]) => byDateDesc(resolveContent(items));

export async function getCategories(): Promise<Category[]> {
  return allCategories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return allCategories.find((c) => c.slug === slug);
}

export async function getArticles(): Promise<Article[]> {
  return resolved(await allArticles());
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const stored = await getStoredArticle(slug);
  if (stored && (stored.status ?? "published") === "published") return stored;
  return seededArticles.find((a) => a.slug === slug);
}

export async function getArticlesByCategory(category: CategorySlug): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.category === category));
}

export async function getArticlesByAuthor(authorSlug: string): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.authorSlug === authorSlug));
}

export async function getArticlesByRegion(region: "local" | "national" | "world"): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.region === region));
}

export async function getFeaturedArticles(): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.featured));
}

export async function getTrendingArticles(): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.trending));
}

export async function getMostReadArticles(): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.mostRead));
}

export async function getBreakingArticles(): Promise<Article[]> {
  return resolved((await allArticles()).filter((a) => a.breaking));
}

export async function getOpinionArticles(): Promise<Article[]> {
  return getArticlesByCategory("opinion");
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  return resolved(
    (await allArticles()).filter(
      (a) => a.slug !== article.slug && (a.category === article.category || a.authorSlug === article.authorSlug)
    )
  ).slice(0, limit);
}

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return resolved(
    (await allArticles()).filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    )
  );
}

/**
 * Author reads go through the profile store, which merges the seed
 * roster with whatever authors have saved from the dashboard — so a
 * profile edit shows up on the public site without a code change.
 */
export async function getAuthors(): Promise<Author[]> {
  return listAuthorProfiles();
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  return getAuthorProfile(slug);
}

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

export async function getNewsletterIssueBySlug(slug: string): Promise<NewsletterIssue | undefined> {
  return allNewsletterIssues.find((n) => n.slug === slug);
}

/* -------------------------------------------------------------------- */
/* Section visibility                                                    */
/* -------------------------------------------------------------------- */

/**
 * Categories that actually have something published in them. Empty
 * sections are hidden from navigation, the homepage, and the sitemap
 * rather than presenting readers with a dead end.
 */
export async function getActiveCategories(): Promise<Category[]> {
  const published = await getArticles();
  const used = new Set(published.map((a) => a.category));
  return allCategories.filter((c) => used.has(c.slug));
}

export async function categoryHasArticles(slug: string): Promise<boolean> {
  const published = await getArticles();
  return published.some((a) => a.category === slug);
}

/** Which non-article collections have anything in them. */
export async function getActiveSections() {
  const [articles, books, videos, conversations, issues] = await Promise.all([
    getArticles(),
    getBooks(),
    getVideos(),
    getConversations(),
    getNewsletterIssues(),
  ]);
  return {
    articles: articles.length > 0,
    books: books.length > 0,
    videos: videos.length > 0,
    conversations: conversations.length > 0,
    newsletter: issues.length > 0,
  };
}
