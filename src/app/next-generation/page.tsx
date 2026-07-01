import type { Metadata } from "next";
import { getArticlesByAuthor, getAuthorBySlug, getBookBySlug } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { BookCard } from "@/components/shared/book-card";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Next Generation",
  description:
    "Books, essays, reviews, commentary, and projects from the Journal's Next Generation program for younger voices.",
  alternates: { canonical: `${siteConfig.url}/next-generation` },
};

const readingLists = [
  { title: "Civic Foundations", items: ["The Porch Light", "Letters to the Next Council", "What the River Remembers"] },
  { title: "Essays on Belonging", items: ["The Long Table", "What We Owe Each Other (essay)", "Youth Council Reader"] },
];

const upcomingBooks = [
  { title: "The Waiting Room", author: "A Next Generation Fellow", date: "Fall 2026" },
  { title: "Field Notes on Growing Up Here", author: "A Next Generation Fellow", date: "Winter 2026" },
];

export default async function NextGenerationPage() {
  const fellow = await getAuthorBySlug("sam-whitfield");
  if (!fellow) notFound();
  const [articles, book] = await Promise.all([
    getArticlesByAuthor("sam-whitfield"),
    getBookBySlug("letters-to-the-next-council"),
  ]);

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Next Generation", href: "/next-generation" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd(
              "Next Generation",
              "Books, essays, reviews, and commentary from the Journal's younger contributors.",
              `${siteConfig.url}/next-generation`
            ),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Next Generation", url: `${siteConfig.url}/next-generation` },
            ]),
          ]),
        }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">Younger Voices</p>
        <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Next Generation</h1>
        <p className="mt-4 text-base text-muted">
          A dedicated space for the Journal&apos;s youth fellowship &mdash;
          books, essays, reviews, commentary, and projects from writers
          just beginning their careers. Placeholder introduction for the
          rebuild.
        </p>
      </header>

      {/* Featured Articles */}
      <section className="py-12">
        <h2 className="font-serif text-2xl font-bold">Featured Articles</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      {/* Books */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Books</h2>
        <div className="mt-6 grid max-w-xs grid-cols-1">
          {book && <BookCard book={book} authorName={fellow.name} />}
        </div>
      </section>

      {/* Upcoming Books */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Upcoming Books</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {upcomingBooks.map((b) => (
            <li key={b.title} className="rounded-lg border border-border p-4">
              <p className="font-semibold">{b.title}</p>
              <p className="mt-1 text-sm text-muted">{b.author} &middot; {b.date}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Reading Lists */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Reading Lists</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {readingLists.map((list) => (
            <div key={list.title} className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-serif text-lg font-bold">{list.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                {list.items.map((item) => (
                  <li key={item}>&bull; {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Projects / Youth Perspectives */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Youth Perspectives &amp; Projects</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Next Generation fellows also run independent projects &mdash;
          oral history collection, civic data visualizations, and
          neighborhood zines. Placeholder description of the program&apos;s
          project track for the rebuild.
        </p>
      </section>

      <div className="mt-4">
        <NewsletterSignup />
      </div>
    </div>
  );
}
