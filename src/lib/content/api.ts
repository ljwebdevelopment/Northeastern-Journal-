/**
 * Data access boundary. Every page/component goes through these functions
 * rather than importing `data.ts` directly, so the placeholder dataset can
 * later be swapped for a real CMS client (WordPress, Sanity, Strapi,
 * Contentful, Payload) without touching UI code.
 */
import {
  articles as allArticles,
  authors as allAuthors,
  books as allBooks,
  categories as allCategories,
  conversations as allConversations,
  newsletterIssues as allNewsletterIssues,
  videos as allVideos,
} from "./data";
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

export async function getCategories(): Promise<Category[]> {
  return allCategories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return allCategories.find((c) => c.slug === slug);
}

export async function getArticles(): Promise<Article[]> {
  return byDateDesc(allArticles);
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  return allArticles.find((a) => a.slug === slug);
}

export async function getArticlesByCategory(category: CategorySlug): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.category === category));
}

export async function getArticlesByAuthor(authorSlug: string): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.authorSlug === authorSlug));
}

export async function getArticlesByRegion(region: "local" | "national" | "world"): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.region === region));
}

export async function getFeaturedArticles(): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.featured));
}

export async function getTrendingArticles(): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.trending));
}

export async function getMostReadArticles(): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.mostRead));
}

export async function getBreakingArticles(): Promise<Article[]> {
  return byDateDesc(allArticles.filter((a) => a.breaking));
}

export async function getOpinionArticles(): Promise<Article[]> {
  return getArticlesByCategory("opinion");
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  return byDateDesc(
    allArticles.filter(
      (a) => a.slug !== article.slug && (a.category === article.category || a.authorSlug === article.authorSlug)
    )
  ).slice(0, limit);
}

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return byDateDesc(
    allArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    )
  );
}

export async function getAuthors(): Promise<Author[]> {
  return allAuthors;
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  return allAuthors.find((a) => a.slug === slug);
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
