import type { Metadata } from "next";
import { getArticles, getAuthors } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { AuthorCard } from "@/components/shared/author-card";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";

export const metadata: Metadata = {
  title: "Contributors",
  description:
    "The writers, editors, and columnists of the Northeastern Journal — their beats, biographies, and recent work.",
  alternates: { canonical: `${siteConfig.url}/authors` },
};

export default async function AuthorsPage() {
  const [authors, articles] = await Promise.all([getAuthors(), getArticles()]);

  const countFor = (slug: string) =>
    articles.filter((a) => a.authorSlug === slug).length;

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Contributors", href: "/authors" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            collectionPageJsonLd(
              "Contributors",
              "The writers, editors, and columnists of the Northeastern Journal.",
              `${siteConfig.url}/authors`
            ),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Contributors", url: `${siteConfig.url}/authors` },
            ]),
          ]),
        }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">The Masthead</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Contributors</h1>
        <p className="mt-3 text-base text-muted">
          Generations of writers, editors, and columnists — each with a beat, a
          byline, and a body of work beyond these pages.
        </p>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {authors.map((author) => (
          <AuthorCard
            key={author.slug}
            author={author}
            variant="detailed"
            articleCount={countFor(author.slug)}
          />
        ))}
      </div>

      <div className="mt-16">
        <NewsletterSignup source="authors" />
      </div>
    </div>
  );
}
