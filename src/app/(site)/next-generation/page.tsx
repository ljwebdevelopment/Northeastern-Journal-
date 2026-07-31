import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PenLine, Sparkles } from "lucide-react";
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
        {articles.length > 0 && (
        <section className="py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Featured Articles</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
        )}

        {/* Books */}
        {book && (
        <section className="border-t border-border py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Books</h2>
          <div className="mt-8 grid max-w-xs grid-cols-1">
            <BookCard book={book} authorName={fellow.name} />
          </div>
        </section>
        )}


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
