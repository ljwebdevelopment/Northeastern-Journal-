import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByCategory, getCategories, getCategory } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const articles = await getArticlesByCategory(slug as CategorySlug);

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

      {articles.length === 0 ? (
        <p className="mt-12 text-sm text-muted">
          No articles are published in this category yet. Check back soon.
        </p>
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
