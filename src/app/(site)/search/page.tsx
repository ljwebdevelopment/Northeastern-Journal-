import type { Metadata } from "next";
import { searchArticles } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { SearchForm } from "@/components/shared/search-form";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Northeastern Journal's full archive of articles, columns, and interviews.",
  alternates: { canonical: `${siteConfig.url}/search` },
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q ? await searchArticles(q) : [];

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Search", href: "/search" }]} />

      <header className="max-w-2xl">
        <p className="kicker">Full-Site Search</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Search</h1>
        <div className="mt-6">
          <SearchForm defaultValue={q} />
        </div>
      </header>

      {q && (
        <p className="mt-8 text-sm text-muted">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      )}

      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>

      {q && results.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          No articles matched your search. Try a different keyword.
        </p>
      )}
    </div>
  );
}
