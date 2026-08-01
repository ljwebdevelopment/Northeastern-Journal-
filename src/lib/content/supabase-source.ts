import "server-only";

import { createPublicSupabase } from "@/lib/supabase/server";
import type { ArticleWithRelations, AuthorRow, CategoryRow } from "@/lib/supabase/types";
import { htmlToParagraphs } from "@/lib/richtext";
import type { Article, Author, Category, CategorySlug } from "./types";
import { categories as fallbackCategories } from "./data";

/**
 * Reads published content out of Supabase and maps it onto the app's domain
 * types. Every function is failure-tolerant: if Supabase is unreachable or
 * unconfigured it returns an empty array, and `api.ts` falls back to the
 * built-in placeholder archive rather than showing an error page.
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
