/**
 * Article storage. Everything the newsroom publishes is written here
 * from the dashboard — there is no seeded article content.
 *
 * Records live under one key per article so two editors saving different
 * pieces never overwrite each other.
 */
import type { Article } from "@/lib/content/types";
import { getStore } from "./driver";

const KEY_PREFIX = "article:";
const key = (slug: string) => `${KEY_PREFIX}${slug}`;

const byDateDesc = (items: Article[]) =>
  [...items].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

/** Every article, drafts included. Dashboard use only. */
export async function listAllArticles(): Promise<Article[]> {
  const store = getStore();
  const keys = await store.keys(KEY_PREFIX);
  const records = await Promise.all(keys.map((k) => store.get<Article>(k)));
  return byDateDesc(records.filter((a): a is Article => Boolean(a)));
}

/** Published articles only — what the public site reads. */
export async function listPublishedArticles(): Promise<Article[]> {
  const all = await listAllArticles();
  return all.filter((a) => (a.status ?? "published") === "published");
}

export async function getStoredArticle(slug: string): Promise<Article | null> {
  return getStore().get<Article>(key(slug));
}

export async function saveArticle(article: Article): Promise<Article> {
  const record: Article = { ...article, updatedAt: new Date().toISOString() };
  await getStore().set(key(article.slug), record);
  return record;
}

export async function deleteArticle(slug: string): Promise<void> {
  await getStore().delete(key(slug));
}

/**
 * Turns a title into a URL slug, appending a counter if that slug is
 * already taken so two pieces with the same headline can coexist.
 */
export async function uniqueSlug(title: string, currentSlug?: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "untitled";

  if (currentSlug === base) return base;

  let candidate = base;
  let counter = 2;
  while (await getStoredArticle(candidate)) {
    if (candidate === currentSlug) return candidate;
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}
