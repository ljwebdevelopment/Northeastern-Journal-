import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { isResendConfigured } from "@/lib/email/resend";
import type { EditorArticle } from "@/components/admin/article-editor";

/** Everything the editor screen needs besides the article itself. */
export async function loadEditorContext(isAdmin: boolean) {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return { categories: [], authors: [], subscriberCount: 0, emailReady: false };
  }

  const [{ data: categories }, { data: authors }, subscriberCount] = await Promise.all([
    supabase.from("categories").select("slug, name").order("sort_order"),
    supabase.from("authors").select("slug, name").eq("is_active", true).order("name"),
    isAdmin
      ? supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", "confirmed")
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);

  return {
    categories: categories ?? [],
    authors: authors ?? [],
    subscriberCount,
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
