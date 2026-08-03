import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByCategory, getCategories, getCategory, paginate } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { Pagination } from "@/components/shared/pagination";
import type { CategorySlug } from "@/lib/content/types";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `${siteConfig.url}/category/${slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page = "1" } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const articles = await getArticlesByCategory(slug as CategorySlug);
  // Hidden from navigation and the sitemap while empty, so it shouldn't be
  // reachable by URL either.
  if (articles.length === 0) notFound();

  const pageData = paginate(articles, Number(page));

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: category.name, href: `/category/${slug}` }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd(category.name, category.description, `${siteConfig.url}/category/${slug}`),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: category.name, url: `${siteConfig.url}/category/${slug}` },
            ]),
          ]),
        }}
      />

      <header className="max-w-2xl">
        <p className="kicker">Category</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{category.name}</h1>
        <p className="mt-3 text-base text-muted">{category.description}</p>
      </header>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {pageData.items.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>

      <Pagination
        page={pageData.page}
        pageCount={pageData.pageCount}
        basePath={`/category/${slug}`}
      />
    </div>
  );
}
