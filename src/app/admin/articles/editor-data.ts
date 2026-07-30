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
