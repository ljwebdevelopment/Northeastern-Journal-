import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser, canPublish } from "@/lib/auth/roles";
import { ArticleEditor, type EditorArticle } from "@/components/admin/article-editor";
import { loadEditorContext } from "../editor-data";

export const metadata = { title: "Edit Article" };

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { notice, saved } = await searchParams;
  // A brand-new article redirects here after its first save, so the action's
  // own result message is gone by the time this renders.
  const banner = notice ?? (saved ? "Saved. This article now has its own URL." : null);

  const user = await requireNewsroomUser(`/admin/articles/${id}`);
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("articles")
    .select(
      `*, category:categories(slug), author:authors(slug), article_tags(tag:tags(slug, name))`
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const category = row.category as unknown as { slug: string } | null;
  const author = row.author as unknown as { slug: string } | null;
  const tagRows = (row.article_tags ?? []) as unknown as {
    tag: { slug: string; name: string } | null;
  }[];

  const article: EditorArticle = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    excerpt: row.excerpt ?? "",
    bodyHtml: row.body_html ?? "",
    bodyMarkdown: row.body_markdown ?? "",
    status: row.status,
    publishedAt: row.published_at,
    scheduledFor: row.scheduled_for,
    categorySlug: category?.slug ?? "",
    authorSlug: author?.slug ?? "",
    featuredImageUrl: row.featured_image_url ?? "",
    featuredImageAlt: row.featured_image_alt ?? "",
    featuredImageCaption: row.featured_image_caption ?? "",
    seoTitle: row.seo_title ?? "",
    metaDescription: row.meta_description ?? "",
    tags: tagRows.map((t) => t.tag?.name).filter((n): n is string => Boolean(n)),
    region: row.region ?? "",
    isFeatured: row.is_featured,
    isBreaking: row.is_breaking,
    isTrending: row.is_trending,
    notifySubscribers: row.notify_subscribers,
    notifiedAt: row.notified_at,
    updatedAt: row.updated_at,
  };

  const context = await loadEditorContext(user.profile.role === "admin");

  return (
    <>
      {banner && (
        <p className="mx-auto mb-4 max-w-5xl rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          {banner}
        </p>
      )}
      <ArticleEditor
        article={article}
        categories={context.categories}
        authors={context.authors}
        canPublish={canPublish(user.profile.role)}
        subscriberCount={context.subscriberCount}
        emailReady={context.emailReady}
      />
    </>
  );
}
