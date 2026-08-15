import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArticleBySlug,
  getArticleComments,
  getArticles,
  getAuthorBySlug,
  getCategory,
  getRelatedArticles,
} from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { socialImage, twitterMetadata, xHandle } from "@/lib/social-image";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ArticleCard } from "@/components/article/article-card";
import { ShareButtons } from "@/components/article/share-buttons";
import { ReadingProgress } from "@/components/article/reading-progress";
import { ReaderControls } from "@/components/article/reader-controls";
import { LikeButton } from "@/components/article/like-button";
import { CommentSection } from "@/components/article/comment-section";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { ARTICLE_PROSE_CLASS } from "@/components/article/prose";
import { cn, formatDate, readingTime } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";
import { ViewTracker } from "@/components/article/view-tracker";
import { demoContentConfig } from "@/lib/content/demo-config";

/**
 * Published articles are static until something changes; `revalidateTag` in
 * the CMS save path clears them the moment an editor hits Publish.
 */
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const author = await getAuthorBySlug(article.authorSlug);
  const url = article.canonicalUrl
    ?? `${siteConfig.url}/article/${article.category}/${article.slug}`;
  const noindex = Boolean(article.isDemo) && !demoContentConfig.indexable;
  const description = article.metaDescription || article.excerpt;
  const title = article.seoTitle || article.title;
  // Lead images are stored at 3:2. A story with no usable photo falls back to
  // its own generated headline card (see `opengraph-image.tsx`) rather than
  // the site-wide image, so no two articles share a preview.
  const image = socialImage(
    article.image,
    article.imageAlt || article.title,
    { width: 1200, height: 800 },
    // Built from the site URL, not `url` — a syndicated story's canonicalUrl
    // points at another domain, which has no such route.
    {
      url: `${siteConfig.url}/article/${article.category}/${article.slug}/opengraph-image`,
      alt: article.title,
    }
  );

  return {
    title,
    description,
    authors: author ? [{ name: author.name, url: `${siteConfig.url}/author/${author.slug}` }] : undefined,
    keywords: article.tags,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: siteConfig.name,
      title,
      description,
      url,
      images: [image],
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: author ? [author.name] : undefined,
      section: article.category,
      tags: article.tags,
    },
    twitter: twitterMetadata({
      title,
      description,
      image,
      creator: xHandle(author?.social.twitter),
    }),
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.category !== categorySlug) notFound();

  const [author, category, related, comments] = await Promise.all([
    getAuthorBySlug(article.authorSlug),
    getCategory(article.category),
    getRelatedArticles(article, 3),
    // Placeholder archive entries have no Supabase row, so this is empty for
    // them and the section renders its "be the first" state.
    getArticleComments(article.slug),
  ]);

  const url = `${siteConfig.url}/article/${article.category}/${article.slug}`;
  const minutes =
    article.readingMinutes ?? readingTime(article.body.join(" ").split(/\s+/).length);

  // Only surface an "updated" line when the revision is meaningfully later
  // than publication — a same-day typo fix isn't news.
  const updatedLater =
    article.updatedAt &&
    +new Date(article.updatedAt) - +new Date(article.publishedAt) > 12 * 60 * 60 * 1000;

  return (
    <article className="content-container py-8 sm:py-10">
      <ReadingProgress targetId="article-body" />
      {/* Placeholder archive entries have no row to count against. */}
      {!article.isDemo && <ViewTracker slug={article.slug} />}
      <Breadcrumbs
        items={[
          ...(category ? [{ name: category.name, href: `/category/${category.slug}` }] : []),
          { name: article.title, href: `/article/${article.category}/${article.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleJsonLd(article, author, comments.filter((c) => !c.is_deleted).length),
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              ...(category
                ? [{ name: category.name, url: `${siteConfig.url}/category/${category.slug}` }]
                : []),
              { name: article.title, url },
            ]),
          ]),
        }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Headline block                                                    */}
      {/* ---------------------------------------------------------------- */}
      <header className="mx-auto max-w-3xl">
        <p className="kicker">
          <Link href={`/category/${article.category}`}>
            {category?.name ?? article.category}
          </Link>
        </p>

        <h1 className="mt-3 text-balance font-serif text-[2rem] font-bold leading-[1.12] sm:text-5xl">
          {article.title}
        </h1>

        {article.subtitle && (
          <p className="mt-4 text-balance font-serif text-xl leading-snug text-muted sm:text-2xl">
            {article.subtitle}
          </p>
        )}

        <p className="mt-4 text-lg leading-relaxed text-muted">{article.excerpt}</p>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
          <div className="flex items-center gap-3">
            {author && (
              <>
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                  <Image
                    src={author.photo}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="text-sm">
                  <Link
                    href={`/author/${author.slug}`}
                    className="font-semibold hover:text-accent"
                  >
                    {author.name}
                  </Link>
                  <p className="text-muted">
                    <time dateTime={article.publishedAt}>
                      {formatDate(article.publishedAt)}
                    </time>
                    {" · "}
                    {minutes} min read
                    {(article.viewCount ?? 0) > 0 && (
                      <> &middot; {formatViews(article.viewCount!)} views</>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Like sits with share rather than at the foot of the story: a
              reader decides they rate a piece well before they finish it, and
              the row is already the page's action strip. */}
          <div className="flex flex-wrap items-center gap-2">
            <LikeButton
              slug={article.slug}
              initialCount={article.likeCount ?? 0}
              compact
            />
            <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
            <ReaderControls />
            <ShareButtons url={url} title={article.title} />
          </div>
        </div>

        {updatedLater && (
          <p className="mt-3 text-xs text-muted">
            Updated{" "}
            <time dateTime={article.updatedAt}>{formatDate(article.updatedAt!)}</time>
          </p>
        )}
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Lead image                                                        */}
      {/* ---------------------------------------------------------------- */}
      <figure className="mx-auto mt-8 max-w-4xl">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface-muted">
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            priority
            fetchPriority="high"
            className="object-cover"
          />
        </div>
        {article.imageCaption && (
          <figcaption className="mt-2.5 text-sm leading-relaxed text-muted">
            {article.imageCaption}
          </figcaption>
        )}
      </figure>

      {/* ---------------------------------------------------------------- */}
      {/* Body                                                              */}
      {/* ---------------------------------------------------------------- */}
      <div
        id="article-body"
        className={cn(ARTICLE_PROSE_CLASS, "mt-10")}
        // Sanitized on write in `sanitizeArticleHtml` — see lib/richtext.ts.
        dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Tags + share                                                      */}
      {/* ---------------------------------------------------------------- */}
      {article.tags.length > 0 && (
        <div className="mx-auto mt-10 flex max-w-[38rem] flex-wrap gap-2">
          {article.tags.map((t) => (
            <Link
              key={t}
              href={`/tag/${encodeURIComponent(t)}`}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-brand"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* The heart lives up in the header now; the foot of the story keeps
          share and the letters link, plus a route into the discussion. */}
      <div className="mx-auto mt-8 flex max-w-[38rem] flex-wrap items-center justify-center gap-4 border-t border-border pt-8">
        <ShareButtons url={url} title={article.title} />
        <a href="#comments" className="text-sm font-semibold text-accent hover:underline">
          Join the discussion ↓
        </a>
        <Link
          href={`/letters/new?article=${encodeURIComponent(article.slug)}`}
          className="text-sm font-semibold text-accent hover:underline"
        >
          Write to the editor about this →
        </Link>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Author card                                                       */}
      {/* ---------------------------------------------------------------- */}
      {author && (
        <aside className="mx-auto mt-12 max-w-[38rem] rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface-muted">
              <Image src={author.photo} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="kicker">{author.role}</p>
              <h2 className="mt-1 font-serif text-xl font-bold">
                <Link href={`/author/${author.slug}`} className="hover:text-accent">
                  {author.name}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{author.bio}</p>
              <Link
                href={`/author/${author.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
              >
                More from {author.name.split(" ")[0]} →
              </Link>
            </div>
          </div>
        </aside>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Related                                                           */}
      {/* ---------------------------------------------------------------- */}
      {related.length > 0 && (
        <section data-print-hide className="mx-auto mt-16 max-w-5xl border-t border-border pt-10">
          <h2 className="font-serif text-2xl font-bold">Related Reading</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      <CommentSection slug={article.slug} initialComments={comments} />

      <div className="mx-auto mt-16 max-w-3xl">
        <NewsletterSignup compact source="article" />
      </div>
    </article>
  );
}
