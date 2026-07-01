import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Facebook, Instagram, Rss, Twitter, Youtube } from "lucide-react";
import { getArticlesByAuthor, getAuthorBySlug, getAuthors, getCategories } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import Link from "next/link";

export async function generateStaticParams() {
  const authors = await getAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: `${siteConfig.url}/author/${slug}` },
    openGraph: { images: [author.photo] },
  };
}

const socialIcons = {
  substack: Rss,
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
} as const;

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const [articles, categories] = await Promise.all([
    getArticlesByAuthor(slug),
    getCategories(),
  ]);
  const relatedCategories = categories.filter((c) => author.relatedTopics.includes(c.slug));

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: author.name, href: `/author/${slug}` }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            personJsonLd(author),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: author.name, url: `${siteConfig.url}/author/${slug}` },
            ]),
          ]),
        }}
      />

      <header className="grid gap-8 border-b border-border pb-10 sm:grid-cols-[10rem_1fr] sm:items-center">
        <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-full bg-surface-muted sm:mx-0 sm:w-full">
          <Image src={author.photo} alt={author.name} fill sizes="160px" className="object-cover" />
        </div>
        <div>
          <p className="kicker">{author.role}</p>
          <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{author.name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{author.longBio}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {(Object.keys(socialIcons) as (keyof typeof socialIcons)[])
              .filter((key) => author.social[key])
              .map((key) => {
                const Icon = socialIcons[key];
                return (
                  <a
                    key={key}
                    href={author.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-accent hover:text-accent"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                );
              })}
          </div>
        </div>
      </header>

      {relatedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 py-6">
          {relatedCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:border-accent hover:text-accent"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <section className="py-6">
        <h2 className="font-serif text-2xl font-bold">Featured Articles</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
        {articles.length === 0 && (
          <p className="mt-4 text-sm text-muted">No articles published yet.</p>
        )}
      </section>

      <section className="border-t border-border py-6">
        <h2 className="font-serif text-2xl font-bold">Archive</h2>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {articles.map((a) => (
            <div key={a.slug} className="py-3 first:pt-0">
              <ArticleCard article={a} variant="compact" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
