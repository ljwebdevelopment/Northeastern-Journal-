import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticlesByAuthor, getAuthorBySlug, getBookBySlug, getBooks } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { bookJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { formatDate } from "@/lib/utils";
import { BookOpen, ExternalLink } from "lucide-react";

export async function generateStaticParams() {
  const books = await getBooks();
  return books.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return {};
  const url = `${siteConfig.url}/books/${slug}`;
  return {
    title: book.title,
    description: book.synopsis,
    alternates: { canonical: url },
    openGraph: {
      type: "book",
      siteName: siteConfig.name,
      title: book.title,
      description: book.synopsis,
      url,
      images: [{ url: book.cover, width: 800, height: 1200, alt: `Cover of ${book.title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: book.title,
      description: book.synopsis,
      images: [book.cover],
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const author = await getAuthorBySlug(book.authorSlug);
  const relatedArticles = author ? (await getArticlesByAuthor(author.slug)).slice(0, 3) : [];

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Books", href: "/books" }, { name: book.title, href: `/books/${slug}` }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            bookJsonLd(book, author?.name),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Books", url: `${siteConfig.url}/books` },
              { name: book.title, url: `${siteConfig.url}/books/${slug}` },
            ]),
          ]),
        }}
      />

      <div className="grid gap-10 sm:grid-cols-[16rem_1fr]">
        <div className="relative mx-auto aspect-[2/3] w-48 overflow-hidden rounded-lg bg-surface-muted shadow-md sm:mx-0 sm:w-full">
          <Image src={book.cover} alt={`Cover of ${book.title}`} fill sizes="256px" className="object-cover" />
        </div>
        <div>
          <p className="kicker">Book</p>
          <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{book.title}</h1>
          {author && (
            <p className="mt-2 text-sm text-muted">
              by{" "}
              <Link href={`/author/${author.slug}`} className="font-semibold hover:text-accent">
                {author.name}
              </Link>
              {" · "}
              <time dateTime={book.publishedAt}>{formatDate(book.publishedAt)}</time>
            </p>
          )}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/90">{book.synopsis}</p>

          <blockquote className="mt-6 max-w-xl border-l-2 border-accent pl-4 font-serif text-lg italic text-foreground/85">
            &ldquo;{book.reviewExcerpt}&rdquo;
          </blockquote>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={book.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              Buy the Book <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            {book.readingGuideUrl && (
              <a
                href={book.readingGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Reading Guide
              </a>
            )}
          </div>
        </div>
      </div>

      {relatedArticles.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="font-serif text-2xl font-bold">Related Articles</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {relatedArticles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
