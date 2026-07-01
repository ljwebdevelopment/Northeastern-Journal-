import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Facebook, Mic, Rss as SubstackIcon, Twitter, Youtube } from "lucide-react";
import { getArticlesByAuthor, getAuthorBySlug, getVideos } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { VideoCard } from "@/components/shared/video-card";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Cherokee Nana",
  description:
    "Cherokee Nana's personal brand hub: biography, columns, videos, podcast, quotes, reading list, and timeline.",
  alternates: { canonical: `${siteConfig.url}/cherokee-nana` },
};

const quotes = [
  "“Listening is the first civic duty.”",
  "“A family that argues at the table is a family that still trusts each other.”",
  "“The news is just the neighborhood, written down.”",
];

const readingList = [
  { title: "The Porch Light", note: "My own collection of essays on neighborliness." },
  { title: "What the River Remembers", note: "Victor's history of the county's waterways." },
  { title: "The Long Table", note: "Renata's love letter to Main Street." },
];

const timeline = [
  { year: "1968", label: "The Journal's earliest predecessor begins as a family mimeograph." },
  { year: "1991", label: "Cherokee Nana writes her first Sunday column." },
  { year: "2015", label: "The Sunday Letter newsletter launches." },
  { year: "2026", label: "Northeastern Journal relaunches as a full civic platform." },
];

export default async function CherokeeNanaPage() {
  const author = await getAuthorBySlug("cherokee-nana");
  if (!author) notFound();

  const [columns, videos] = await Promise.all([
    getArticlesByAuthor("cherokee-nana"),
    getVideos(),
  ]);
  const herVideos = videos.filter((v) => v.playlist === "Cherokee Nana Talks");

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Cherokee Nana", href: "/cherokee-nana" }]} />
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

      {/* Biography */}
      <header className="grid gap-8 border-b border-border pb-12 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-44 overflow-hidden rounded-full bg-surface-muted lg:mx-0 lg:w-full">
          <Image src={author.photo} alt={author.name} fill sizes="220px" className="object-cover" />
        </div>
        <div>
          <p className="kicker">Founding Columnist</p>
          <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{author.name}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {author.longBio}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {author.social.substack && (
              <a href={author.social.substack} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent">
                <SubstackIcon className="h-3.5 w-3.5" aria-hidden="true" /> Substack
              </a>
            )}
            {author.social.youtube && (
              <a href={author.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent">
                <Youtube className="h-3.5 w-3.5" aria-hidden="true" /> YouTube
              </a>
            )}
            {author.social.twitter && (
              <a href={author.social.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent">
                <Twitter className="h-3.5 w-3.5" aria-hidden="true" /> Twitter
              </a>
            )}
            {author.social.facebook && (
              <a href={author.social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent">
                <Facebook className="h-3.5 w-3.5" aria-hidden="true" /> Facebook
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Featured Columns */}
      <section className="py-12">
        <h2 className="font-serif text-2xl font-bold">Featured Columns</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {columns.slice(0, 3).map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      {/* Column Archive */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Column Archive</h2>
        <div className="mt-6 flex flex-col divide-y divide-border">
          {columns.map((a) => (
            <div key={a.slug} className="py-3 first:pt-0">
              <ArticleCard article={a} variant="compact" />
            </div>
          ))}
        </div>
      </section>

      {/* Substack + YouTube embeds */}
      <section className="grid gap-8 border-t border-border py-12 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl font-bold">On Substack</h2>
          <div className="mt-4 flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center">
            <SubstackIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 max-w-xs text-sm text-muted">
              Substack embed placeholder. Connect Cherokee Nana&apos;s
              publication URL to display recent posts here.
            </p>
            <a
              href={author.social.substack}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
            >
              Visit Substack
            </a>
          </div>
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold">Videos</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {(herVideos.length ? herVideos : videos.slice(0, 2)).map((v) => (
              <VideoCard key={v.slug} video={v} />
            ))}
          </div>
        </div>
      </section>

      {/* Podcast */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">The Porch Light Podcast</h2>
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-surface p-6">
          <Mic className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-sm text-muted">
            Podcast embed placeholder &mdash; connect an RSS feed from
            Apple Podcasts, Spotify, or a self-hosted player to surface
            episodes here.
          </p>
        </div>
      </section>

      {/* Quotes + Reading list */}
      <section className="grid gap-8 border-t border-border py-12 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl font-bold">Favorite Quotes</h2>
          <ul className="mt-4 space-y-4">
            {quotes.map((q) => (
              <li key={q} className="border-l-2 border-accent pl-4 font-serif text-lg italic text-foreground/85">
                {q}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold">Reading Recommendations</h2>
          <ul className="mt-4 space-y-3">
            {readingList.map((r) => (
              <li key={r.title} className="rounded-lg border border-border p-4">
                <p className="font-semibold">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Timeline</h2>
        <ol className="mt-6 space-y-6 border-l border-border pl-6">
          {timeline.map((t) => (
            <li key={t.year} className="relative">
              <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-accent" />
              <p className="kicker">{t.year}</p>
              <p className="mt-1 text-sm text-foreground/85">{t.label}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Speaking */}
      <section className="border-t border-border py-12">
        <h2 className="font-serif text-2xl font-bold">Speaking</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Cherokee Nana speaks regularly at civic forums, library events,
          and community gatherings on family, memory, and local journalism.
          Placeholder booking information for the rebuild.
        </p>
        <Link
          href="/about"
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          Request a Speaking Engagement
        </Link>
      </section>

      <div className="mt-4">
        <NewsletterSignup />
      </div>
    </div>
  );
}
