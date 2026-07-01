import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArticleBySlug,
  getArticles,
  getAuthorBySlug,
  getCategory,
  getRelatedArticles,
} from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { formatDate, readingTime } from "@/lib/utils";
import { demoContentConfig } from "@/lib/content/demo-config";

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  const url = `${siteConfig.url}/article/${article.category}/${article.slug}`;
  const noindex = Boolean(article.isDemo) && !demoContentConfig.indexable;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url,
      images: [{ url: article.image, width: 1200, height: 800 }],
      publishedTime: article.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.image],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.category !== categorySlug) notFound();

  const [author, category, related] = await Promise.all([
    getAuthorBySlug(article.authorSlug),
    getCategory(article.category),
    getRelatedArticles(article),
  ]);

  const words = article.body.join(" ").split(/\s+/).length;

  return (
    <article className="content-container py-10">
      <Breadcrumbs
        items={[
          ...(category ? [{ name: category.name, href: `/category/${category.slug}` }] : []),
          { name: article.title, href: `/article/${article.category}/${article.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleJsonLd(article, author),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              ...(category ? [{ name: category.name, url: `${siteConfig.url}/category/${category.slug}` }] : []),
              { name: article.title, url: `${siteConfig.url}/article/${article.category}/${article.slug}` },
            ]),
          ]),
        }}
      />

      <header className="mx-auto max-w-3xl">
        <p className="kicker">
          <Link href={`/category/${article.category}`}>{category?.name ?? article.category}</Link>
        </p>
        <h1 className="mt-3 text-balance font-serif text-3xl font-bold leading-tight sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-muted">{article.excerpt}</p>

        <div className="mt-6 flex items-center gap-3 border-y border-border py-4">
          {author && (
            <>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                <Image src={author.photo} alt={author.name} fill sizes="40px" className="object-cover" />
              </div>
              <div className="text-sm">
                <Link href={`/author/${author.slug}`} className="font-semibold hover:text-accent">
                  {author.name}
                </Link>
                <p className="text-muted">
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                  {" · "}
                  {readingTime(words)} min read
                </p>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative mx-auto mt-8 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl bg-surface-muted">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="(min-width: 1024px) 900px, 100vw"
          priority
          className="object-cover"
        />
      </div>

      <div className="prose prose-neutral dark:prose-invert mx-auto mt-10 max-w-2xl prose-headings:font-serif">
        {article.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="mx-auto mt-8 flex max-w-2xl flex-wrap gap-2">
        {article.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted"
          >
            #{t}
          </span>
        ))}
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl border-t border-border pt-10">
          <h2 className="font-serif text-2xl font-bold">Related &amp; Suggested Reading</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
