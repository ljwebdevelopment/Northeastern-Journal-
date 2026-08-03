import type { Metadata } from "next";
import { paginate, searchArticles } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Northeastern Journal's full archive of articles, columns, and interviews.",
  alternates: { canonical: `${siteConfig.url}/search` },
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const results = q ? await searchArticles(q) : [];
  const pageData = paginate(results, Number(page), 12);

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Search", href: "/search" }]} />

      <header className="max-w-2xl">
        <p className="kicker">Full-Site Search</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Search</h1>
        <div className="mt-6">
          <SearchForm defaultValue={q} />
        </div>
        <p className="mt-3 text-xs text-muted">
          All your words have to appear. Put a phrase in &ldquo;quotes&rdquo; to
          keep it together, or put &minus; in front of a word to leave it out.
        </p>
      </header>

      {q && (
        <p className="mt-8 text-sm text-muted">
          {pageData.total} result{pageData.total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          {pageData.pageCount > 1 && (
            <>
              {" "}
              &middot; page {pageData.page} of {pageData.pageCount}
            </>
          )}
        </p>
      )}

      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {pageData.items.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>

      <Pagination
        page={pageData.page}
        pageCount={pageData.pageCount}
        basePath="/search"
        params={{ q }}
      />

      {q && pageData.total === 0 && (
        <p className="mt-4 text-sm text-muted">
          No articles matched your search. Try fewer or broader words.
        </p>
      )}
    </div>
  );
}
