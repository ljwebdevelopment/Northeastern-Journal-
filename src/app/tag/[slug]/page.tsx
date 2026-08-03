import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticlesByTag, getTags, paginate } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { Pagination } from "@/components/shared/pagination";

/**
 * Tags were a dead end before this route existed: every article printed them,
 * none of them went anywhere. A tag is the only cross-section the archive has
 * — "budget" runs through politics, community, and education — so it is worth
 * a real page rather than a search query in disguise.
 */

export const revalidate = 300;
export const dynamicParams = true;

/** Only the well-used tags are prebuilt; the long tail renders on demand. */
export async function generateStaticParams() {
  const tags = await getTags();
  return tags.filter((t) => t.count > 1).map((t) => ({ slug: t.slug }));
}

const label = (slug: string) => slug.replace(/-/g, " ");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = label(decodeURIComponent(slug));
  return {
    title: `#${name}`,
    description: `Every Northeastern Journal story tagged ${name}.`,
    alternates: { canonical: `${siteConfig.url}/tag/${slug}` },
  };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page = "1" } = await searchParams;
  const tag = decodeURIComponent(slug);

  const articles = await getArticlesByTag(tag);
  if (articles.length === 0) notFound();

  const pageData = paginate(articles, Number(page));
  const name = label(tag);

  return (
    <div className="content-container py-10">
      <Breadcrumbs
        items={[
          { name: "Tags", href: "/tag" },
          { name: `#${name}`, href: `/tag/${slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd(
              `#${name}`,
              `Every Northeastern Journal story tagged ${name}.`,
              `${siteConfig.url}/tag/${slug}`
            ),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Tags", url: `${siteConfig.url}/tag` },
              { name: `#${name}`, url: `${siteConfig.url}/tag/${slug}` },
            ]),
          ]),
        }}
      />

      <header className="max-w-2xl">
        <p className="kicker">Tag</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">#{name}</h1>
        <p className="mt-3 text-base text-muted">
          {pageData.total} {pageData.total === 1 ? "story" : "stories"} across every section.{" "}
          <Link href="/tag" className="font-semibold text-accent hover:underline">
            Browse all tags
          </Link>
        </p>
      </header>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {pageData.items.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>

      <Pagination
        page={pageData.page}
        pageCount={pageData.pageCount}
        basePath={`/tag/${slug}`}
      />
    </div>
  );
}
