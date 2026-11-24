import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Award, Globe, Mail, MapPin, Mic } from "lucide-react";
import {
  getArticlesByAuthor,
  getArticlesFeaturingAuthor,
  getArticlesMentioningAuthor,
  getAuthorBySlug,
  getBooksByAuthor,
  getConversationsWithAuthor,
  getAuthorSubscriberCount,
  getAuthors,
  getCategories,
  paginate,
} from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { socialImage, twitterMetadata, xHandle } from "@/lib/social-image";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { AuthorSocial } from "@/components/shared/author-social";
import { AuthorSubscribe } from "@/components/shared/author-subscribe";
import { ShareProfileButton } from "@/components/shared/share-profile-button";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { Pagination } from "@/components/shared/pagination";
import { SubstackIcon } from "@/components/icons/brand-icons";
import { formatViews } from "@/lib/format-views";
import type { ProfessionalLinkKind } from "@/lib/content/types";
import { isContentDegraded } from "@/lib/content/outage";
import { ServiceNotice } from "@/components/shared/service-notice";
import {
  KIND_LABELS,
  WorkFilters,
  WorkList,
  WorkTabs,
  type WorkItem,
  type WorkKind,
} from "@/components/author/author-work";
import type { Article, Author, Category } from "@/lib/content/types";

// Pagination reads `searchParams`, which cannot be accessed while Next is
// statically generating. Any slug not covered by `generateStaticParams`
// otherwise fails with DYNAMIC_SERVER_USAGE instead of rendering — and
// during a backend outage that is *every* slug, which would replace the
// service notice with a 500.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const authors = await getAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  const title = `${author.name} — ${author.role}`;
  const url = `${siteConfig.url}/author/${author.slug}`;
  // Search snippets and share cards truncate around 160 characters; cut on a
  // word boundary so the preview never ends mid-word.
  const description =
    author.bio.length > 160
      ? `${author.bio.slice(0, 157).replace(/\s+\S*$/, "")}…`
      : author.bio;
  const [firstName, ...rest] = author.name.trim().split(/\s+/);
  const portrait = socialImage(author.photo, `Portrait of ${author.name}`, {
    width: 800,
    height: 1000,
  });

  return {
    title,
    description,
    keywords: author.relatedTopics,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      siteName: siteConfig.name,
      title,
      description,
      url,
      images: [portrait],
      firstName,
      ...(rest.length > 0 ? { lastName: rest.join(" ") } : {}),
      ...(author.username ? { username: author.username } : {}),
    },
    twitter: {
      ...twitterMetadata({
        title,
        description,
        image: portrait,
        creator: xHandle(author.social.twitter),
      }),
      // Portrait crops lose the face in a wide card.
      card: "summary" as const,
    },
  };
}

/** Section headings for grouped outside work. */
const LINK_GROUPS: { kind: ProfessionalLinkKind; title: string; description: string }[] = [
  { kind: "syndicated", title: "Nationally Syndicated", description: "Carried by wire services and partner papers." },
  { kind: "publication", title: "Other Publications", description: "Work published outside the Journal." },
  { kind: "award", title: "Awards & Honors", description: "Recognition for reporting and service." },
  { kind: "press", title: "Press & Appearances", description: "Interviews, panels, broadcasts, and podcasts." },
  { kind: "portfolio", title: "Portfolio", description: "Personal collections and long-form archives." },
];

/** Sections that run as recurring columns rather than one-off articles. */
const COLUMN_CATEGORIES = new Set(["opinion", "editorial"]);
const WORK_PER_PAGE = 20;
const KIND_ORDER: WorkKind[] = ["article", "column", "book", "conversation"];

function articleItem(
  a: Article,
  author: Author,
  categories: Category[],
  role: WorkItem["role"]
): WorkItem {
  return {
    key: `article:${a.slug}`,
    kind: COLUMN_CATEGORIES.has(a.category) ? "column" : "article",
    role:
      role === "Byline" && a.authorSlug !== author.slug && a.coAuthorSlugs?.includes(author.slug)
        ? "Co-author"
        : role,
    title: a.title,
    href: `/article/${a.category}/${a.slug}`,
    publishedAt: a.publishedAt,
    excerpt: a.excerpt,
    image: a.image,
    imageAlt: a.imageAlt,
    section: categories.find((c) => c.slug === a.category)?.name,
  };
}

const byNewest = (a: WorkItem, b: WorkItem) =>
  +new Date(b.publishedAt) - +new Date(a.publishedAt);

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
      <p className="font-serif text-2xl font-bold leading-none text-white sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
        {label}
      </p>
    </div>
  );
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; tab?: string; type?: string }>;
}) {
  const { slug } = await params;
  const { page = "1", tab: tabParam, type: typeParam } = await searchParams;
  const author = await getAuthorBySlug(slug);
  if (!author && isContentDegraded()) return <ServiceNotice />;
  if (!author) notFound();

  // Reached via the author's handle — send them to the canonical URL.
  if (author.slug !== slug) redirect(`/author/${author.slug}`);

  const [articles, taggedIn, mentionedIn, books, conversations, categories, subscriberCount] =
    await Promise.all([
      getArticlesByAuthor(author.slug),
      getArticlesFeaturingAuthor(author.slug),
      getArticlesMentioningAuthor(author),
      getBooksByAuthor(author.slug),
      getConversationsWithAuthor(author.slug),
      getCategories(),
      getAuthorSubscriberCount(author.slug),
    ]);
  const showCount = author.showSubscriberCount ?? true;

  const beats = categories.filter(
    (c) => author.relatedTopics.includes(c.slug) || articles.some((a) => a.category === c.slug)
  );
  const featured = articles.filter((a) => a.featured).slice(0, 3);
  const recent = articles.slice(0, 6);

  /*
   * The work section: everything on the Journal with this person's name on it,
   * split into what they made (bylines, co-bylines, books, conversations) and
   * what features them (tagged as a contributor, or mentioned in the text).
   */
  const publishedWork: WorkItem[] = [
    ...articles.map((a) => articleItem(a, author, categories, "Byline")),
    ...books.map(
      (b): WorkItem => ({
        key: `book:${b.slug}`,
        kind: "book",
        role: "Author",
        title: b.title,
        href: `/books/${b.slug}`,
        publishedAt: b.publishedAt,
        excerpt: b.synopsis,
        image: b.cover,
        imageAlt: `Cover of ${b.title}`,
      })
    ),
    ...conversations.map(
      (c): WorkItem => ({
        key: `conversation:${c.slug}`,
        kind: "conversation",
        role: "Participant",
        title: c.title,
        href: `/conversations/${c.slug}`,
        publishedAt: c.publishedAt,
        excerpt: c.excerpt,
        image: c.image,
        imageAlt: c.title,
      })
    ),
  ].sort(byNewest);
  const featuringWork: WorkItem[] = [
    ...taggedIn.map((a) => articleItem(a, author, categories, "Tagged")),
    ...mentionedIn.map((a) => articleItem(a, author, categories, "Mentioned")),
  ].sort(byNewest);

  const tab = tabParam === "mentions" ? "mentions" : "published";
  const tabItems = tab === "mentions" ? featuringWork : publishedWork;
  const kindsPresent = KIND_ORDER.filter((k) => tabItems.some((i) => i.kind === k));
  const kind = kindsPresent.includes(typeParam as WorkKind) ? (typeParam as WorkKind) : undefined;
  const workPage = paginate(
    kind ? tabItems.filter((i) => i.kind === kind) : tabItems,
    Number(page),
    WORK_PER_PAGE
  );
  const profilePath = `/author/${author.slug}`;
  const workHref = (q: { tab?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (q.tab && q.tab !== "published") query.set("tab", q.tab);
    if (q.type) query.set("type", q.type);
    const qs = query.toString();
    return `${profilePath}${qs ? `?${qs}` : ""}#work`;
  };
  const workTabs = [
    { label: "Published & Co-authored", key: "published", count: publishedWork.length },
    { label: "Tagged & Mentioned", key: "mentions", count: featuringWork.length },
  ].map((t) => ({ ...t, href: workHref({ tab: t.key }), active: tab === t.key }));
  const workFilters =
    kindsPresent.length > 1
      ? [
          { label: "All", count: tabItems.length, href: workHref({ tab }), active: !kind },
          ...kindsPresent.map((k) => ({
            label: KIND_LABELS[k].many,
            count: tabItems.filter((i) => i.kind === k).length,
            href: workHref({ tab, type: k }),
            active: kind === k,
          })),
        ]
      : [];
  const totalViews = articles.reduce((sum, a) => sum + (a.viewCount ?? 0), 0);
  const awards = (author.professionalLinks ?? []).filter((l) => l.kind === "award").length;
  const outsideWork = (author.professionalLinks ?? []).filter((l) => l.kind !== "award").length;

  /**
   * Subscribers sit alongside the other numbers rather than competing with
   * them, and show from the first day — a count of 0 is the honest answer.
   * The only thing that hides it is the author's own privacy toggle. The
   * remaining tiles drop out when there is nothing to count.
   */
  const stats: { value: string | number; label: string }[] = [
    { value: articles.length, label: articles.length === 1 ? "Article published" : "Articles published" },
    ...(showCount
      ? [
          {
            value: subscriberCount.toLocaleString(),
            label: subscriberCount === 1 ? "Subscriber" : "Subscribers",
          },
        ]
      : []),
    ...(totalViews > 0 ? [{ value: formatViews(totalViews), label: "Total reads" }] : []),
    ...(outsideWork > 0 ? [{ value: outsideWork, label: "Outside bylines" }] : []),
    ...(awards > 0 ? [{ value: awards, label: "Awards" }] : []),
  ];
  const statColumns =
    stats.length >= 5
      ? "sm:grid-cols-3"
      : stats.length === 4
        ? "sm:grid-cols-4"
        : stats.length === 3
          ? "sm:grid-cols-3"
          : "sm:grid-cols-2";

  const linkGroups = LINK_GROUPS.map((group) => ({
    ...group,
    items: (author.professionalLinks ?? []).filter((l) => l.kind === group.kind),
  })).filter((group) => group.items.length > 0);

  const substackUrl =
    (author.social as Record<string, string | undefined>)?.substack ?? undefined;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            personJsonLd(author, beats.map((c) => c.name)),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: author.name, url: `${siteConfig.url}/author/${author.slug}` },
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
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-4 border-white/20 bg-white/10 shadow-2xl">
              <Image
                src={author.photo}
                alt={`Portrait of ${author.name}`}
                fill
                sizes="(min-width: 1024px) 20rem, 16rem"
                priority
                className="object-cover"
              />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="kicker-inverted">{author.role}</p>
              {author.foundingRole && (
                <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {author.foundingRole}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-balance font-serif text-4xl font-bold leading-[1.05] sm:text-6xl">
              {author.name}
            </h1>
            {author.username && (
              <p className="mt-2 text-sm font-medium text-white/70">@{author.username}</p>
            )}

            {author.location && (
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/80">
                <MapPin className="h-4 w-4" aria-hidden /> {author.location}
              </p>
            )}

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
              <AuthorSocial author={author} inverted />
              <ShareProfileButton
                url={`${siteConfig.url}/author/${author.slug}`}
                name={author.name}
                inverted
              />
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
                showCount={showCount}
                inverted
              />
            </div>

            <div className={`mt-7 grid grid-cols-2 gap-3 ${statColumns}`}>
              {stats.map((stat) => (
                <StatTile key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="content-container">
        <div className="pt-6">
          <Breadcrumbs items={[{ name: author.name, href: `/author/${author.slug}` }]} />
        </div>

        {/* About + beats */}
        <section className="grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="rule-red font-serif text-2xl font-bold">About the Author</h2>
            <div className="mt-8 space-y-4 text-[1.0625rem] leading-relaxed text-foreground/90">
              {(author.longBio || author.bio)
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          </div>

          {beats.length > 0 && (
            <aside>
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
            </aside>
          )}
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Featured Work</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}

        {/* Recent */}
        <section className="border-t border-border py-12">
          <h2 className="rule-red font-serif text-2xl font-bold">Recent Articles</h2>
          {recent.length > 0 ? (
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">
              {author.name} hasn&rsquo;t published with the Journal yet.
            </p>
          )}
        </section>

        {/* All work, by relationship */}
        <section id="work" className="scroll-mt-24 border-t border-border py-12">
          <h2 className="rule-red font-serif text-2xl font-bold">All Work on the Journal</h2>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            Every article, column, book, and conversation carrying {author.name}&rsquo;s name —
            and the pieces where they&rsquo;re tagged or mentioned.
          </p>
          <div className="mt-8">
            <WorkTabs tabs={workTabs} />
            {workFilters.length > 0 && <WorkFilters filters={workFilters} />}
            <WorkList
              items={workPage.items}
              empty={
                tab === "mentions"
                  ? `${author.name} hasn’t been tagged or mentioned in any pieces yet.`
                  : `${author.name} hasn’t published with the Journal yet.`
              }
            />
            <Pagination
              page={workPage.page}
              pageCount={workPage.pageCount}
              basePath={profilePath}
              params={{ tab: tab === "mentions" ? tab : undefined, type: kind }}
              hash="work"
            />
          </div>
        </section>

        {/* Substack */}
        {substackUrl && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">On Substack</h2>
            <a
              href={substackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center gap-4 rounded-xl border border-border bg-surface p-6 transition-colors card-shadow hover:border-brand"
            >
              <SubstackIcon className="h-7 w-7 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-serif text-lg font-bold">Read {author.name} on Substack</p>
                <p className="mt-1 text-sm text-muted">
                  Posts that don&rsquo;t run in the Journal — opens in a new tab.
                </p>
              </div>
              <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 text-muted" aria-hidden />
            </a>
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
              <Mic className="h-7 w-7 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-serif text-lg font-bold">Listen to {author.name}</p>
                <p className="mt-1 text-sm text-muted">
                  Episodes, interviews, and conversations.
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
                <h2 className="rule-red font-serif text-2xl font-bold">Reading Recommendations</h2>
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

        {/* Elsewhere */}
        {linkGroups.length > 0 && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Elsewhere</h2>
            <p className="mt-5 max-w-2xl text-sm text-muted">
              Syndicated columns, outside bylines, honors, and appearances beyond the Journal.
            </p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {linkGroups.map((group) => (
                <div key={group.kind} className="rounded-xl border border-border bg-surface p-6">
                  <div className="flex items-center gap-2">
                    {group.kind === "award" && <Award className="h-4 w-4 text-brand" aria-hidden />}
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
                            <span className="mt-2 block text-sm text-muted">{item.description}</span>
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

        {/* Speaking */}
        {author.speaking && (
          <section className="border-t border-border py-12">
            <h2 className="rule-red font-serif text-2xl font-bold">Speaking</h2>
            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">{author.speaking}</p>
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

        <section className="border-t border-border py-12">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="font-serif text-2xl font-bold">Subscribe to {author.name}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Get new work by email as it publishes. No confirmation step, and
              you can unsubscribe from any issue.
            </p>
            <div className="mt-6 flex justify-center">
              <AuthorSubscribe
                authorSlug={author.slug}
                authorName={author.name}
                subscriberCount={subscriberCount}
                showCount={showCount}
              />
            </div>
          </div>

          <div className="mt-10">
            <NewsletterSignup source={`author-${author.slug}`} />
          </div>
        </section>
      </div>
    </div>
  );
}
