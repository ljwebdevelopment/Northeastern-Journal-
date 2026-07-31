import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/auth/session";
import { getAuthors, getCategories } from "@/lib/content/api";
import { ArticleForm } from "@/components/admin/article-form";

export const metadata: Metadata = { title: "New article" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const account = await getCurrentAccount();
  if (!account) return null;

  const [categories, authors] = await Promise.all([getCategories(), getAuthors()]);

  return (
    <div>
      <header className="mb-6">
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1.5 font-serif text-3xl font-bold">New article</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Publish straight away, or save a draft and come back to it.
        </p>
      </header>

      <ArticleForm
        categories={categories}
        authors={authors}
        canChooseAuthor={account.role === "owner"}
        defaultAuthorSlug={account.authorSlug}
      />
    </div>
  );
}
