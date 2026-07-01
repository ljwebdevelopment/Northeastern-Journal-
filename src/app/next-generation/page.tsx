import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, PenLine, Rocket, Sparkles } from "lucide-react";
import { getArticlesByAuthor, getAuthorBySlug, getBookBySlug } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { BookCard } from "@/components/shared/book-card";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";

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
    <div>
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

      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-accent to-brand text-brand-foreground">
        <div className="content-container py-14 text-center lg:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Younger Voices
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-balance font-serif text-4xl font-bold sm:text-6xl">
            Next Generation
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
            A dedicated space for the Journal&apos;s youth fellowship &mdash;
            books, essays, reviews, commentary, and projects from writers
            just beginning their careers.
          </p>
        </div>
      </section>

      <div className="content-container">
        <div className="pt-6">
          <Breadcrumbs items={[{ name: "Next Generation", href: "/next-generation" }]} />
        </div>

        {/* Featured Articles */}
        <section className="py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Featured Articles</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>

        {/* Books + Upcoming */}
        <section className="grid gap-10 border-t border-border py-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">Books</h2>
            <div className="mt-8 grid max-w-xs grid-cols-1">
              {book && <BookCard book={book} authorName={fellow.name} />}
            </div>
          </div>
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">Upcoming Books</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {upcomingBooks.map((b) => (
                <li
                  key={b.title}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-5 card-shadow transition-shadow hover:shadow-lg"
                >
                  <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{b.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {b.author} &middot; {b.date}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Reading Lists */}
        <section className="border-t border-border py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Reading Lists</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {readingLists.map((list) => (
              <div
                key={list.title}
                className="rounded-2xl border border-border bg-surface p-6 card-shadow transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4.5 w-4.5 text-brand" aria-hidden="true" />
                  <h3 className="font-serif text-lg font-bold">{list.title}</h3>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {list.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground/80"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Projects / Youth Perspectives */}
        <section className="border-t border-border py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Youth Perspectives &amp; Projects</h2>
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-surface-muted p-6">
            <PenLine className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Next Generation fellows also run independent projects &mdash;
              oral history collection, civic data visualizations, and
              neighborhood zines. Placeholder description of the program&apos;s
              project track for the rebuild.
            </p>
          </div>
        </section>

        <div className="py-10">
          <NewsletterSignup />
        </div>
      </div>
    </div>
  );
}
