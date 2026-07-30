import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Facebook, Mic, Quote, Rss as SubstackIcon, Twitter, Youtube } from "lucide-react";
import { getArticlesByAuthor, getAuthorBySlug, getVideos } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { VideoCard } from "@/components/shared/video-card";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";

export const metadata: Metadata = {
  title: "Cherokee Nana",
  description:
    "Cherokee Nana's personal brand hub: biography, columns, videos, podcast, quotes, reading list, and timeline.",
  alternates: { canonical: `${siteConfig.url}/cherokee-nana` },
};

const featuredQuote =
  "Listening is the first civic duty. Everything I've ever written started with sitting still long enough to hear someone else's version of the truth.";

const quotes = [
  "“A family that argues at the table is a family that still trusts each other.”",
  "“The news is just the neighborhood, written down.”",
  "“Memory is a civic resource. We ought to fund it like one.”",
];

const readingList = [
  { title: "The Porch Light", note: "My own collection of essays on neighborliness." },
  { title: "What the River Remembers", note: "Victor's history of the county's waterways." },
  { title: "The Long Table", note: "Renata's love letter to Main Street." },
];

const timeline = [
  { year: "1968", label: "The Journal's earliest predecessor begins as a mimeographed community bulletin." },
  { year: "1991", label: "Cherokee Nana writes her first Sunday column." },
  { year: "2015", label: "The Sunday Letter newsletter launches." },
  { year: "2026", label: "Northeastern Journal relaunches as a full civic platform." },
];

const socialLinks = [
  { key: "substack", icon: SubstackIcon, label: "Substack" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "twitter", icon: Twitter, label: "Twitter" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
] as const;

export default async function CherokeeNanaPage() {
  const author = await getAuthorBySlug("cherokee-nana");
  if (!author) notFound();

  const [columns, videos] = await Promise.all([
    getArticlesByAuthor("cherokee-nana"),
    getVideos(),
  ]);
  const herVideos = videos.filter((v) => v.playlist === "Cherokee Nana Talks");
  const popularColumns = columns.filter((c) => c.mostRead || c.trending);
  const recentColumns = columns.slice(0, 6);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            personJsonLd(author),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Cherokee Nana", url: `${siteConfig.url}/cherokee-nana` },
            ]),
          ]),
        }}
      />

      {/* Flagship hero: portrait + featured quote */}
      <section className="relative overflow-hidden bg-brand text-brand-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full border-[3px] border-white" />
          <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full border-[3px] border-white" />
        </div>
        <div className="content-container relative grid gap-10 py-14 lg:grid-cols-[22rem_1fr] lg:items-center lg:py-20">
          <div className="relative mx-auto aspect-[4/5] w-64 overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl lg:mx-0 lg:w-full">
            <Image
              src={author.photo}
              alt={author.name}
              fill
              sizes="(min-width: 1024px) 22rem, 16rem"
              priority
              className="object-cover"
            />
          </div>
          <div>
            <p className="kicker-inverted">Founding Columnist &middot; Flagship Voice</p>
            <h1 className="mt-3 font-serif text-4xl font-bold sm:text-6xl">{author.name}</h1>
            <div className="mt-6 max-w-2xl">
              <Quote className="h-8 w-8 text-white/40" aria-hidden="true" />
              <p className="mt-2 text-balance font-serif text-2xl italic leading-snug text-white sm:text-3xl">
                {featuredQuote}
              </p>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/80">
              {author.longBio}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {socialLinks
                .filter((s) => author.social[s.key])
                .map(({ key, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={author.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </section>

      <div className="content-container">
        <div className="pt-6">
          <Breadcrumbs items={[{ name: "Cherokee Nana", href: "/cherokee-nana" }]} />
        </div>

        {/* Recent Columns */}
        <section className="py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Recent Columns</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {recentColumns.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>

        {/* Popular Columns */}
        {popularColumns.length > 0 && (
          <section className="border-t border-border py-10">
            <h2 className="rule-red font-serif text-2xl font-bold">Popular Columns</h2>
            <div className="mt-8 flex flex-col divide-y divide-border">
              {popularColumns.map((a, i) => (
                <div key={a.slug} className="flex items-baseline gap-4 py-3.5 first:pt-0">
                  <span className="font-serif text-2xl font-bold text-brand">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ArticleCard article={a} variant="compact" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Substack + Videos */}
        <section className="grid gap-8 border-t border-border py-10 lg:grid-cols-2">
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">On Substack</h2>
            <div className="mt-8 flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center">
              <SubstackIcon className="h-8 w-8 text-muted" aria-hidden="true" />
              <p className="mt-3 max-w-xs text-sm text-muted">
                Substack embed placeholder. Connect Cherokee Nana&apos;s
                publication URL to display recent posts here.
              </p>
              <a
                href={author.social.substack}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
              >
                Visit Substack
              </a>
            </div>
          </div>
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">Featured Videos</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {(herVideos.length ? herVideos : videos.slice(0, 2)).map((v) => (
                <VideoCard key={v.slug} video={v} />
              ))}
            </div>
          </div>
        </section>

        {/* Podcast */}
        <section className="border-t border-border py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">The Porch Light Podcast</h2>
          <div className="mt-8 flex items-center gap-4 rounded-xl border border-border bg-surface p-6 card-shadow">
            <Mic className="h-8 w-8 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-sm text-muted">
              Podcast embed placeholder &mdash; connect an RSS feed from
              Apple Podcasts, Spotify, or a self-hosted player to surface
              episodes here.
            </p>
          </div>
        </section>

        {/* Quotes + Reading list */}
        <section className="grid gap-8 border-t border-border py-10 lg:grid-cols-2">
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">Favorite Quotes</h2>
            <ul className="mt-8 space-y-4">
              {quotes.map((q) => (
                <li key={q} className="border-l-2 border-brand pl-4 font-serif text-lg italic text-foreground/85">
                  {q}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">Reading Recommendations</h2>
            <ul className="mt-8 space-y-3">
              {readingList.map((r) => (
                <li key={r.title} className="rounded-lg border border-border p-4 card-shadow">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-1 text-sm text-muted">{r.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Timeline */}
        <section className="border-t border-border py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Timeline</h2>
          <ol className="mt-9 space-y-7 border-l-2 border-border pl-7">
            {timeline.map((t) => (
              <li key={t.year} className="relative">
                <span className="absolute -left-[2.15rem] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-brand" />
                <p className="kicker">{t.year}</p>
                <p className="mt-1 text-sm text-foreground/85">{t.label}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Speaking */}
        <section className="border-t border-border py-10">
          <h2 className="rule-red font-serif text-2xl font-bold">Speaking</h2>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
            Cherokee Nana speaks regularly at civic forums, library events,
            and community gatherings on memory, place, and local journalism.
            Placeholder booking information for the rebuild.
          </p>
          <Link
            href="/about"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            Request a Speaking Engagement
          </Link>
        </section>

        <div className="py-10">
          <NewsletterSignup />
        </div>
      </div>
    </div>
  );
}
