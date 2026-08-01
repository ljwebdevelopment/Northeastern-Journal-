import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthors, getBooks } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { BookCard } from "@/components/shared/book-card";

export const metadata: Metadata = {
  title: "Books",
  description:
    "Book landing pages, reviews, buy links, and reading guides from the Northeastern Journal.",
  alternates: { canonical: `${siteConfig.url}/books` },
};

export default async function BooksPage() {
  const [books, authors] = await Promise.all([getBooks(), getAuthors()]);
  // Nothing published here yet — hide the page rather than show an empty one.
  if (books.length === 0) notFound();
  const authorName = (slug: string) => authors.find((a) => a.slug === slug)?.name;

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Books", href: "/books" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd("Books", "Book reviews and recommendations from the Journal.", `${siteConfig.url}/books`),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Books", url: `${siteConfig.url}/books` },
            ]),
          ]),
        }}
      />

      <header className="max-w-2xl">
        <p className="kicker">Books Desk</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Books</h1>
        <p className="mt-3 text-base text-muted">
          Reviews, reading guides, and titles from Journal contributors.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((b) => (
          <BookCard key={b.slug} book={b} authorName={authorName(b.authorSlug)} />
        ))}
      </div>
    </div>
  );
}
