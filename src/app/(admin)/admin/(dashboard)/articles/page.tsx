import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, PencilLine } from "lucide-react";
import { getCurrentAccount } from "@/lib/auth/session";
import { listAllArticles } from "@/lib/store/articles";
import { getAuthors, getCategories } from "@/lib/content/api";
import { toggleArticleStatusAction } from "@/lib/articles/actions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const account = await getCurrentAccount();
  if (!account) return null;

  const [all, categories, authors] = await Promise.all([
    listAllArticles(),
    getCategories(),
    getAuthors(),
  ]);

  // Authors see their own work; owners see the whole newsroom's.
  const articles =
    account.role === "owner"
      ? all
      : all.filter((a) => a.authorSlug === account.authorSlug);

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;
  const authorName = (slug: string) =>
    authors.find((a) => a.slug === slug)?.name ?? slug;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold">Articles</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Write and publish into any section. A section only appears on the
            site once it has a published article in it.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden /> New article
        </Link>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <h2 className="font-serif text-xl font-bold">Nothing published yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            The site is running with no articles, so article-driven sections
            stay hidden. Publish your first piece and its section appears in
            the navigation automatically.
          </p>
          <Link
            href="/admin/articles/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden /> Write the first article
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => {
            const published = (article.status ?? "published") === "published";
            return (
              <li
                key={article.slug}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        published
                          ? "rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand"
                          : "rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted"
                      }
                    >
                      {published ? "Published" : "Draft"}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-muted">
                      {categoryName(article.category)}
                    </span>
                  </div>
                  <p className="mt-1.5 font-serif text-lg font-bold leading-snug">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {authorName(article.authorSlug)} · {formatDate(article.publishedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={toggleArticleStatusAction}>
                    <input type="hidden" name="slug" value={article.slug} />
                    <button
                      type="submit"
                      className="rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
                    >
                      {published ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                  <Link
                    href={`/admin/articles/${article.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
                  >
                    <PencilLine className="h-3.5 w-3.5" aria-hidden /> Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
