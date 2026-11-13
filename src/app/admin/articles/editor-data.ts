import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { isResendConfigured } from "@/lib/email/resend";
import type { EditorArticle } from "@/components/admin/article-editor";

/** Everything the editor screen needs besides the article itself. */
export async function loadEditorContext(isAdmin: boolean) {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return {
      categories: [],
      authors: [],
      authorSubscriberCounts: {} as Record<string, number>,
      emailReady: false,
    };
  }

  const [{ data: categories }, { data: authors }, authorSubscriberCounts] = await Promise.all([
    supabase.from("categories").select("slug, name").order("sort_order"),
    supabase.from("authors").select("slug, name").eq("is_active", true).order("name"),
    // Announcements go only to an author's followers, so the editor shows
    // that number rather than the size of the whole list.
    isAdmin
      ? supabase
          .rpc("author_subscriber_counts")
          .then(({ data }) =>
            Object.fromEntries(
              ((data ?? []) as { author_slug: string; subscribers: number }[]).map((r) => [
                r.author_slug,
                r.subscribers,
              ])
            ) as Record<string, number>
          )
      : Promise.resolve({} as Record<string, number>),
  ]);

  return {
    categories: categories ?? [],
    authors: authors ?? [],
    authorSubscriberCounts,
    emailReady: isResendConfigured,
  };
}

export const blankArticle = (authorSlug: string): EditorArticle => ({
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  bodyHtml: "",
  bodyMarkdown: "",
  status: "draft",
  publishedAt: null,
  scheduledFor: null,
  categorySlug: "",
  authorSlug,
  coAuthorSlugs: [],
  featuredSlugs: [],
  featuredImageUrl: "",
  featuredImageAlt: "",
  featuredImageCaption: "",
  seoTitle: "",
  metaDescription: "",
  tags: [],
  region: "",
  isFeatured: false,
  isBreaking: false,
  isTrending: false,
  notifySubscribers: false,
  notifiedAt: null,
});

/**
 * An article's co-authors and tagged contributors, as slugs in byline order.
 * Empty when migration 0018 hasn't run, so the editor still opens.
 */
export async function loadArticleBylines(articleId: string) {
  const supabase = await createServerSupabase();
  if (!supabase) return { coAuthorSlugs: [], featuredSlugs: [] };

  type Row = { author: { slug: string } | null };
  const slugsFrom = (data: unknown) =>
    ((data ?? []) as Row[]).map((r) => r.author?.slug).filter((s): s is string => Boolean(s));

  const [co, featured] = await Promise.all([
    supabase
      .from("article_coauthors")
      .select("position, author:authors(slug)")
      .eq("article_id", articleId)
      .order("position"),
    supabase
      .from("article_mentions")
      .select("position, author:authors(slug)")
      .eq("article_id", articleId)
      .order("position"),
  ]);

  return { coAuthorSlugs: slugsFrom(co.data), featuredSlugs: slugsFrom(featured.data) };
}
