import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { getAuthors, getCategories } from "@/lib/content/api";
import { getStoredArticle } from "@/lib/store/articles";
import { ArticleForm } from "@/components/admin/article-form";

export const metadata: Metadata = { title: "Edit article" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) return null;

  const { slug } = await params;
  const article = await getStoredArticle(slug);
  if (!article) notFound();

  if (account.role !== "owner" && article.authorSlug !== account.authorSlug) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl font-bold">Not your article</h1>
        <p className="mt-2 text-sm text-muted">
          You can only edit articles published under your own byline.
        </p>
        <Link
          href="/admin/articles"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Back to articles
        </Link>
      </div>
    );
  }

  const [categories, authors] = await Promise.all([getCategories(), getAuthors()]);

  return (
    <div>
      <header className="mb-6">
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1.5 font-serif text-3xl font-bold">Edit article</h1>
      </header>

      <ArticleForm
        article={article}
        categories={categories}
        authors={authors}
        canChooseAuthor={account.role === "owner"}
        defaultAuthorSlug={account.authorSlug}
      />
    </div>
  );
}
