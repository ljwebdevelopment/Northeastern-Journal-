import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Award, Globe, Mail, MapPin, Mic, Quote } from "lucide-react";
import { SubstackIcon } from "@/components/icons/brand-icons";
import {
  getArticlesByAuthor,
  getAuthorBySlug,
  getCategories,
  getVideos,
} from "@/lib/content/api";
import { countAuthorSubscribers } from "@/lib/store/subscribers";
import { resolveSocial } from "@/lib/authors/social";
import { AuthorSubscribe } from "@/components/shared/author-subscribe";
import { VideoCard } from "@/components/shared/video-card";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/jsonld";
import { buildAuthorStats, groupProfessionalLinks, isPopular } from "@/lib/authors/stats";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { AuthorPhoto } from "@/components/shared/author-photo";
import { SocialLinks } from "@/components/shared/social-links";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { formatDate } from "@/lib/utils";

/**
 * Rendered per request rather than statically. The subscriber count has
 * to be correct the moment someone subscribes — with static generation
 * plus revalidation, the reader who just subscribed still saw the old
 * number on their next page load.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  return {
    title: `${author.name} — ${author.role}`,
    description: author.bio,
    alternates: { canonical: `${siteConfig.url}/author/${slug}` },
    openGraph: {
      type: "profile",
      title: `${author.name} — ${author.role}`,
      description: author.bio,
      images: [author.photo],
    },
  };
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
      <p className="font-serif text-2xl font-bold leading-none text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
        {label}
      </p>
    </div>
  );
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  // Reached via the author's @handle — send them to the canonical URL.
  if (author.slug !== slug) redirect(`/author/${author.slug}`);

  const [articles, categories, videos, subscriberCount] = await Promise.all([
    getArticlesByAuthor(author.slug),
    getCategories(),
    getVideos(),
    countAuthorSubscribers(author.slug),
  ]);

  const authorVideos = author.videoPlaylist
    ? videos.filter((v) => v.playlist === author.videoPlaylist)
    : [];
  const substackUrl = resolveSocial(author.social ?? {}).substack;

  const stats = buildAuthorStats(author, articles, categories);
  const beats = categories.filter(
    (c) => author.relatedTopics.includes(c.slug) || stats.breakdown.some((b) => b.slug === c.slug)
  );
  const featured = articles.filter((a) => a.featured).slice(0, 3);
  const popular = articles.filter(isPopular).slice(0, 5);
  const recent = articles.slice(0, 6);
  const linkGroups = groupProfessionalLinks(author.professionalLinks);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            personJsonLd(author),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Contributors", url: `${siteConfig.url}/authors` },
              { name: author.name, url: `${siteConfig.url}/author/${slug}` },
            ]),
          ]),
        }}
      />

      {/* Hero */}
      <header className="relative overflow-hidden bg-brand text-brand-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden>
          <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full border-[3px] border-white" />
          <div className="absolute -right-20 bottom-[-6rem] h-80 w-80 rounded-full border-[3px] border-white" />
        </div>

        <div className="content-container relative grid gap-10 py-14 lg:grid-cols-[20rem_1fr] lg:items-start lg:py-20">
          <div className="mx-auto w-56 sm:w-64 lg:mx-0 lg:w-full">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl">
              <AuthorPhoto
                src={author.photo}
                alt={`Portrait of ${author.name}`}
                sizes="(min-width: 1024px) 20rem, 16rem"
                priority
              />
            </div>
          </div>

          <div className="min-w-0">
            <p className="kicker-inverted">{author.role}</p>
            <h1 className="mt-3 text-balance font-serif text-4xl font-bold leading-[1.05] sm:text-6xl">
              {author.name}
            </h1>
            {author.username && (
              <p className="mt-2 text-sm font-medium text-white/70">@{author.username}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
              {author.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden /> {author.location}
                </span>
              )}
              {stats.since && (
                <span className="inline-flex items-center gap-1.5">
                  <Quote className="h-4 w-4" aria-hidden /> Writing for the Journal since{" "}
                  {stats.since}
                </span>
              )}
            </div>

            {author.featuredQuote && (
              <blockquote className="mt-7 border-l-2 border-white/40 pl-5">
                <p className="text-balance font-serif text-xl italic leading-snug text-white sm:text-2xl">
                  &ldquo;{author.featuredQuote}&rdquo;
                </p>
              </blockquote>
            )}

            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              {author.bio}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <SocialLinks author={author} inverted />
              {author.website && (
                <a
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
                >
                  <Globe className="h-4 w-4" aria-hidden /> Personal website
                </a>
              )}
              {author.email && (
                <a
                  href={`mailto:${author.email}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-brand transition-opacity hover:opacity-90"
                >
                  <Mail className="h-4 w-4" aria-hidden /> Contact
                </a>
              )}
            </div>

            <div className="mt-7 rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
              <AuthorSubscribe
                authorSlug={author.slug}
                authorName={author.name}
                subscriberCount={subscriberCount}
                showCount={author.showSubscriberCount ?? true}
                inverted
              />
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile value={stats.totalArticles} label="Articles published" />
              {(author.showSubscriberCount ?? true) && subscriberCount > 0 ? (
                <StatTile value={subscriberCount.toLocaleString()} label="Subscribers" />
              ) : (
                <StatTile value={stats.categoryCount} label="Categories" />
              )}
              <StatTile value={stats.externalWorkCount} label="Outside bylines" />
              <StatTile value={stats.awardCount} label="Awards" />
            </div>
          </div>
        </div>
      </header>

      <div className="content-container">
        <div className="pt-6">
          <Breadcrumbs
            items={[
              { name: "Contributors", href: "/authors" },
              { name: author.name, href: `/author/${slug}` },
            ]}
          />
        </div>

        {/* About + beats */}
        <section className="grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">About the Author</h2>
            <div className="mt-8 space-y-4 text-[1.0625rem] leading-relaxed text-foreground/90">
              {author.longBio
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          </div>

          <aside className="space-y-6">
            {beats.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="kicker">Writes About</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {beats.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/category/${c.slug}`}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="kicker">Author Statistics</h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                {(
                  [
                    ["Total articles", String(stats.totalArticles)],
                    ["Featured", String(stats.featuredCount)],
                    ["Most read", String(stats.popularCount)],
                    stats.lastPublishedAt
                      ? ["Latest byline", formatDate(stats.lastPublishedAt)]
                      : null,
                    stats.firstPublishedAt
                      ? ["First byline", formatDate(stats.firstPublishedAt)]
                      : null,
                  ] as ([string, string] | null)[]
                )
                  .filter((row): row is [string, string] => row !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted">{label}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
              </dl>

              {stats.breakdown.length > 0 && (
                <div className="mt-6 space-y-3 border-t border-border pt-5">
                  <p className="kicker">Coverage Mix</p>
                  {stats.breakdown.slice(0, 5).map((row) => (
                    <div key={row.slug}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted">{row.count}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.max(row.share, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="border-t border-border py-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="rule-red font-serif text-2xl font-bold">Featured Work</h2>
              <p className="text-sm text-muted">Editor&rsquo;s picks from {author.name}</p>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}

        {/* Recent + popular */}
        <section className="grid gap-10 border-t border-border py-12 lg:grid-cols-[1fr_22rem]">
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">Recent Articles</h2>
            {recent.length > 0 ? (
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                {recent.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">
                {author.name} hasn&rsquo;t published with the Journal yet.
              </p>
            )}
          </div>

          {popular.length > 0 && (
            <aside>
              <h2 className="rule-red font-serif text-2xl font-bold">Most Read</h2>
              <ol className="mt-8 flex flex-col divide-y divide-border">
                {popular.map((a, i) => (
                  <li key={a.slug} className="flex items-baseline gap-4 py-3 first:pt-0">
                    <span className="font-serif text-2xl font-bold text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <ArticleCard article={a} variant="compact" />
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </section>

        {/* Substack + videos */}
        {(substackUrl || authorVideos.length > 0) && (
          <section className="grid gap-8 border-t border-border py-12 lg:grid-cols-2">
            {substackUrl && (
              <div>
                <h2 className="rule-red font-serif text-2xl font-bold">On Substack</h2>
                <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted p-8 text-center">
                  <SubstackIcon className="h-8 w-8 text-muted" aria-hidden />
                  <p className="mt-3 max-w-xs text-sm text-muted">
                    {author.name} publishes on Substack. Follow along there for
                    posts that don&rsquo;t run in the Journal.
                  </p>
                  <a
                    href={substackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 rounded-full bg-brand px-5 py-2.5 text-xs font-semibold text-brand-foreground transition-opacity hover:opacity-90"
                  >
                    Visit Substack
                  </a>
                </div>
              </div>
            )}
            {authorVideos.length > 0 && (
              <div>
                <h2 className="rule-red font-serif text-2xl font-bold">Featured Videos</h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  {authorVideos.slice(0, 4).map((v) => (
                    <VideoCard key={v.slug} video={v} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Podcast */}
        {author.podcastUrl && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Podcast</h2>
            <a
              href={author.podcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center gap-4 rounded-xl border border-border bg-surface p-6 transition-colors card-shadow hover:border-brand"
            >
              <Mic className="h-8 w-8 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-serif text-lg font-bold">Listen to {author.name}</p>
                <p className="mt-1 text-sm text-muted">
                  Episodes, interviews, and conversations — opens in a new tab.
                </p>
              </div>
              <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 text-muted" aria-hidden />
            </a>
          </section>
        )}

        {/* Quotes + reading list */}
        {((author.quotes?.length ?? 0) > 0 || (author.readingList?.length ?? 0) > 0) && (
          <section className="grid gap-8 border-t border-border py-12 lg:grid-cols-2">
            {(author.quotes?.length ?? 0) > 0 && (
              <div>
                <h2 className="rule-red font-serif text-2xl font-bold">Notable Quotes</h2>
                <ul className="mt-8 space-y-5">
                  {author.quotes!.map((quote) => (
                    <li key={quote.id} className="border-l-2 border-brand pl-4">
                      <p className="font-serif text-lg italic text-foreground/85">
                        &ldquo;{quote.text}&rdquo;
                      </p>
                      {quote.source && (
                        <p className="mt-1.5 text-xs uppercase tracking-wide text-muted">
                          {quote.source}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(author.readingList?.length ?? 0) > 0 && (
              <div>
                <h2 className="rule-red font-serif text-2xl font-bold">
                  Reading Recommendations
                </h2>
                <ul className="mt-8 space-y-3">
                  {author.readingList!.map((item) => {
                    const inner = (
                      <>
                        <p className="font-semibold">{item.title}</p>
                        {item.note && <p className="mt-1 text-sm text-muted">{item.note}</p>}
                      </>
                    );
                    return (
                      <li key={item.id} className="rounded-lg border border-border p-4 card-shadow">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-colors hover:text-brand"
                          >
                            {inner}
                          </a>
                        ) : (
                          inner
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Timeline */}
        {(author.timeline?.length ?? 0) > 0 && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Timeline</h2>
            <ol className="mt-9 space-y-7 border-l-2 border-border pl-7">
              {author.timeline!.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[2.15rem] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-brand" />
                  <p className="kicker">{entry.year}</p>
                  <p className="mt-1 text-sm text-foreground/85">{entry.label}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Speaking */}
        {author.speaking && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Speaking</h2>
            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
              {author.speaking}
            </p>
            {author.email && (
              <a
                href={`mailto:${author.email}`}
                className="mt-5 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Request a Speaking Engagement
              </a>
            )}
          </section>
        )}

        {/* Work published elsewhere */}
        {linkGroups.length > 0 && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Elsewhere</h2>
            <p className="mt-5 max-w-2xl text-sm text-muted">
              Syndicated columns, outside bylines, honors, and appearances beyond
              the Journal.
            </p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {linkGroups.map((group) => (
                <div key={group.kind} className="rounded-xl border border-border bg-surface p-6">
                  <div className="flex items-center gap-2">
                    {group.kind === "award" && (
                      <Award className="h-4 w-4 text-brand" aria-hidden />
                    )}
                    <h3 className="font-serif text-lg font-bold">{group.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted">{group.description}</p>
                  <ul className="mt-5 flex flex-col divide-y divide-border">
                    {group.items.map((item) => {
                      const content = (
                        <>
                          <span className="flex items-start justify-between gap-3">
                            <span className="font-semibold leading-snug">{item.title}</span>
                            {item.url && (
                              <ArrowUpRight
                                className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-brand"
                                aria-hidden
                              />
                            )}
                          </span>
                          {(item.outlet || item.year) && (
                            <span className="mt-1 block text-xs uppercase tracking-wide text-muted">
                              {[item.outlet, item.year].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {item.description && (
                            <span className="mt-2 block text-sm text-muted">
                              {item.description}
                            </span>
                          )}
                        </>
                      );

                      return (
                        <li key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block text-sm transition-colors hover:text-brand"
                            >
                              {content}
                            </a>
                          ) : (
                            <div className="block text-sm">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full archive */}
        {articles.length > recent.length && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Full Archive</h2>
            <div className="mt-8 grid gap-x-10 sm:grid-cols-2">
              {articles.slice(recent.length).map((a) => (
                <div key={a.slug} className="border-b border-border">
                  <ArticleCard article={a} variant="compact" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-border py-12">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="font-serif text-2xl font-bold">
              Subscribe to {author.name}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Get new work by email as it publishes. No confirmation step, and
              you can unsubscribe from any issue.
            </p>
            <div className="mt-6 flex justify-center">
              <AuthorSubscribe
                authorSlug={author.slug}
                authorName={author.name}
                subscriberCount={subscriberCount}
                showCount={author.showSubscriberCount ?? true}
              />
            </div>
          </div>

          <div className="mt-10">
            <NewsletterSignup source={`author/${author.slug}`} />
          </div>
          <p className="mt-8 text-center text-sm text-muted">
            <Link href="/authors" className="font-semibold text-brand hover:underline">
              Meet the rest of the Journal&rsquo;s contributors
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
