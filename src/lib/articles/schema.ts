/**
 * Parsing and validation for the newsroom's article editor.
 */
import type { Article, ArticleStatus, CategorySlug } from "@/lib/content/types";

export type ArticleFieldErrors = Record<string, string>;

export interface ParsedArticle {
  ok: boolean;
  values: Omit<Article, "slug">;
  errors: ArticleFieldErrors;
}

const text = (form: FormData, field: string) => String(form.get(field) ?? "").trim();

export function parseArticleForm(
  form: FormData,
  knownCategories: CategorySlug[],
  knownAuthors: string[]
): ParsedArticle {
  const errors: ArticleFieldErrors = {};

  const title = text(form, "title").slice(0, 200);
  const excerpt = text(form, "excerpt").slice(0, 400);
  const rawBody = String(form.get("body") ?? "");

  // Blank lines separate paragraphs, the way the editor types them.
  const body = rawBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!title) errors.title = "A headline is required.";
  if (!excerpt) errors.excerpt = "Write a one- or two-sentence summary.";
  if (body.length === 0) errors.body = "The article needs at least one paragraph.";

  const categoryValue = text(form, "category") as CategorySlug;
  const category = knownCategories.includes(categoryValue) ? categoryValue : undefined;
  if (!category) errors.category = "Choose a section.";

  const authorSlug = text(form, "authorSlug");
  if (!knownAuthors.includes(authorSlug)) errors.authorSlug = "Choose an author.";

  const image = text(form, "image").slice(0, 5_000_000);
  const imageAlt = text(form, "imageAlt").slice(0, 300);
  if (image && !imageAlt) {
    errors.imageAlt = "Describe the image for readers using a screen reader.";
  }

  const status: ArticleStatus = text(form, "status") === "published" ? "published" : "draft";

  const regionValue = text(form, "region");
  const region =
    regionValue === "local" || regionValue === "national" || regionValue === "world"
      ? regionValue
      : undefined;

  const publishedAtRaw = text(form, "publishedAt");
  const publishedAt = publishedAtRaw
    ? new Date(publishedAtRaw).toISOString()
    : new Date().toISOString();

  const tags = text(form, "tags")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: {
      title,
      excerpt,
      body,
      category: (category ?? "local-news") as CategorySlug,
      authorSlug,
      publishedAt,
      image,
      imageAlt,
      tags,
      status,
      region,
      featured: form.get("featured") === "on",
      trending: form.get("trending") === "on",
      mostRead: form.get("mostRead") === "on",
      breaking: form.get("breaking") === "on",
    },
  };
}

/** `2026-07-31T14:05` for a datetime-local input. */
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
