import Link from "next/link";
import { ArticleCard } from "@/components/article/article-card";
import { LatestTicker } from "@/components/home/latest-ticker";
import { SectionHeader } from "@/components/shared/section-header";
import { siteConfig } from "@/lib/site-config";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { AuthorCard } from "@/components/shared/author-card";
import { ConversationCard } from "@/components/shared/conversation-card";
import {
  getArticles,
  getArticlesByCategory,
  getArticlesByRegion,
  getAuthors,
  getCategories,
  getConversations,
  getFeaturedArticles,
  getMostReadArticles,
  getTrendingArticles,
} from "@/lib/content/api";
import type { Article } from "@/lib/content/types";

/** A numbered rail of stories — used for both Trending and Most Read. */
function RankedRail({ title, articles }: { title: string; articles: Article[] }) {
  return (
    <div>
      <SectionHeader title={title} />
      <ol className="flex flex-col divide-y divide-border">
        {articles.map((a, i) => (
          <li key={a.slug} className="flex items-baseline gap-4 py-3">
            <span className="font-serif text-2xl font-bold text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <ArticleCard article={a} variant="compact" />
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function HomePage() {
  const [
    articles,
    featured,
    trending,
    mostRead,
    opinion,
    community,
    local,
    national,
    editorial,
    politics,
    authors,
    conversations,
    categories,
  ] = await Promise.all([
    getArticles(),
    getFeaturedArticles(),
    getTrendingArticles(),
    getMostReadArticles(),
    getArticlesByCategory("opinion"),
    getArticlesByCategory("community"),
    getArticlesByRegion("local"),
    getArticlesByRegion("national"),
    getArticlesByCategory("editorial"),
    getArticlesByCategory("politics"),
    getAuthors(),
    getConversations(),
    getCategories(),
  ]);

  const hero = featured[0] ?? articles[0];
  const heroSecondary = hero
    ? articles.filter((a) => a.slug !== hero.slug).slice(0, 4)
    : [];
  const authorName = (slug: string) => authors.find((a) => a.slug === slug)?.name;

  // Nothing published yet — a front page with no front is worse than a
  // deliberate holding page.
  if (!hero) {
    return (
      <>
        <section className="content-container py-20 text-center">
          <p className="kicker">Northeastern Journal</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance font-serif text-4xl font-bold leading-tight sm:text-5xl">
            {siteConfig.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted">
            The first edition is on its way. Subscribe and you&apos;ll get our
            reporting the moment it publishes.
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <NewsletterSignup source="home-launch" />
          </div>
        </section>

        {authors.length > 0 && (
          <section className="bg-surface py-12">
            <div className="content-container">
              <SectionHeader
                title="Our Contributors"
                description="The people behind the reporting."
                href="/authors"
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {authors.map((a) => (
                  <AuthorCard key={a.slug} author={a} />
                ))}
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <LatestTicker articles={articles} />

      {/* Hero */}
      <section className="content-container py-10 lg:py-14">
        <p className="kicker rule-red mb-6">Today&apos;s Edition</p>
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-10">
          <ArticleCard article={hero} variant="hero" priority />
          <div className="flex flex-col">
            <h2 className="mb-1 font-serif text-lg font-bold text-foreground">
              More Top Stories
            </h2>
            <div className="flex flex-col divide-y divide-border">
              {heroSecondary.map((a) => (
                <div key={a.slug} className="py-3.5 first:pt-3">
                  <ArticleCard article={a} variant="compact" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="content-container py-10">
        <SectionHeader
          title="Latest News"
          description="The most recent reporting from across the Journal."
          href="/category/local-news"
        />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {articles.slice(0, 8).map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      {/* Featured Opinions */}
      <section className="bg-surface py-10">
        <div className="content-container">
          <SectionHeader
            title="Featured Opinions"
            description="Argued perspectives from our contributors."
            href="/category/opinion"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {opinion.slice(0, 4).map((a) => (
              <ArticleCard key={a.slug} article={a} variant="horizontal" />
            ))}
          </div>
        </div>
      </section>

      {/* Civic Issues + Community */}
      <section className="content-container grid gap-10 py-10 lg:grid-cols-2">
        <div>
          <SectionHeader title="Civic Issues" href="/category/politics" />
          <div className="flex flex-col divide-y divide-border">
            {politics.slice(0, 4).map((a) => (
              <div key={a.slug} className="py-3 first:pt-0">
                <ArticleCard article={a} variant="compact" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Community" href="/category/community" />
          <div className="flex flex-col divide-y divide-border">
            {community.slice(0, 4).map((a) => (
              <div key={a.slug} className="py-3 first:pt-0">
                <ArticleCard article={a} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local / National */}
      <section className="bg-surface py-10">
        <div className="content-container grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="Local News" href="/category/local-news" />
            <div className="space-y-6">
              {local.slice(0, 3).map((a) => (
                <ArticleCard key={a.slug} article={a} variant="horizontal" />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title="National News" href="/category/national-news" />
            <div className="space-y-6">
              {national.slice(0, 3).map((a) => (
                <ArticleCard key={a.slug} article={a} variant="horizontal" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Picks */}
      <section className="content-container py-10">
        <SectionHeader
          title="Editorial Picks"
          description="The Journal's institutional voice."
          href="/category/editorial"
        />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {editorial.slice(0, 4).map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      {/* Trending / Most Read. Most Read is empty until stories have been
          opened, so each rail carries its own half of the row and the section
          disappears entirely rather than printing a heading over nothing. */}
      {(trending.length > 0 || mostRead.length > 0) && (
        <section className="bg-surface py-10">
          <div className="content-container grid gap-10 lg:grid-cols-2">
            {trending.length > 0 && (
              <RankedRail title="Trending" articles={trending.slice(0, 5)} />
            )}
            {mostRead.length > 0 && (
              <RankedRail title="Most Read" articles={mostRead} />
            )}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="content-container py-14">
        <NewsletterSignup />
      </section>

      {/* Featured Authors */}
      <section className="bg-surface py-10">
        <div className="content-container">
          <SectionHeader
            title="Featured Authors"
            description="The voices behind the Journal."
            href="/about"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {authors.map((a) => (
              <AuthorCard key={a.slug} author={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Conversations Preview */}
      <section className="content-container py-10">
        <SectionHeader
          title="Conversations"
          description="Intergenerational dialogue, point/counterpoint, and roundtables."
          href="/conversations"
        />
        <div className="grid gap-8 lg:grid-cols-2">
          {conversations.slice(0, 4).map((c) => (
            <ConversationCard
              key={c.slug}
              conversation={c}
              participantNames={c.participants.map(authorName).filter((n): n is string => Boolean(n))}
            />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-surface py-14">
        <div className="content-container">
          <SectionHeader title="Explore by Category" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="rounded-full border border-border px-4 py-2 text-center text-sm font-medium text-foreground/80 transition-colors hover:border-accent hover:text-accent"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
