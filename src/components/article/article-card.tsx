import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/content/types";
import { categories } from "@/lib/content/data";
import { formatDate, cn } from "@/lib/utils";

const categoryName = (slug: string) =>
  categories.find((c) => c.slug === slug)?.name ?? slug;

/** Small internal-only marker so editors can spot showcase content at a glance. */
function DemoBadge() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <span className="absolute left-3 top-3 z-10 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
      Demo
    </span>
  );
}

export function ArticleCard({
  article,
  variant = "default",
  priority = false,
}: {
  article: Article;
  variant?: "default" | "horizontal" | "compact" | "hero";
  priority?: boolean;
}) {
  const href = `/article/${article.category}/${article.slug}`;

  if (variant === "compact") {
    return (
      <article className="group flex gap-4 py-3.5">
        <Link
          href={href}
          className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted"
        >
          {article.isDemo && <DemoBadge />}
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="min-w-0">
          <p className="kicker">{categoryName(article.category)}</p>
          <h3 className="mt-1 line-clamp-2 font-serif text-sm font-semibold leading-snug">
            <Link href={href} className="transition-colors hover:text-brand">
              {article.title}
            </Link>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === "horizontal") {
    return (
      <article className="group grid grid-cols-[9rem_1fr] gap-5 sm:grid-cols-[12rem_1fr]">
        <Link
          href={href}
          className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-muted card-shadow"
        >
          {article.isDemo && <DemoBadge />}
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="200px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>
        <div className="flex flex-col justify-center">
          <p className="kicker">{categoryName(article.category)}</p>
          <h3 className="mt-1.5 font-serif text-lg font-bold leading-snug">
            <Link href={href} className="transition-colors hover:text-brand">
              {article.title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">
            {article.excerpt}
          </p>
          <time
            dateTime={article.publishedAt}
            className="mt-2.5 text-xs text-muted"
          >
            {formatDate(article.publishedAt)}
          </time>
        </div>
      </article>
    );
  }

  if (variant === "hero") {
    /**
     * The image is absolutely positioned rather than sized by an aspect ratio
     * on the link itself.
     *
     * The hero sits in a grid row beside the "More Top Stories" rail, and grid
     * items stretch to the tallest cell. When the rail ran longer than a 16:9
     * image, the card grew but the picture didn't — leaving a bare strip below
     * it, with the caption (white text, meant to sit on the photograph) pinned
     * to the bottom of the card and effectively invisible. Filling the card
     * means the photo covers whatever height the row settles on, so the text
     * always has an image behind it.
     */
    return (
      <article className="group relative isolate aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-surface-muted card-shadow-lg sm:aspect-[16/9]">
        <Link href={href} className="absolute inset-0 block">
          {article.isDemo && <DemoBadge />}
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="(min-width: 1024px) 66vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        </Link>
        {/* `pointer-events-none` so the caption doesn't punch a dead zone in
            the link behind it; the headline re-enables them for itself. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <p className="kicker-inverted">{categoryName(article.category)}</p>
          <h1 className="mt-3 max-w-2xl text-balance font-serif text-3xl font-bold leading-[1.05] text-white sm:text-5xl">
            <Link href={href} className="pointer-events-auto">
              {article.title}
            </Link>
          </h1>
          <p className="mt-4 hidden max-w-xl text-base text-white/85 sm:line-clamp-2">
            {article.excerpt}
          </p>
          <time dateTime={article.publishedAt} className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/70">
            {formatDate(article.publishedAt)}
          </time>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("group flex flex-col")}>
      <Link
        href={href}
        className="relative block aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-muted card-shadow transition-shadow duration-300 group-hover:shadow-xl"
      >
        {article.isDemo && <DemoBadge />}
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </Link>
      <p className="kicker mt-4">{categoryName(article.category)}</p>
      <h3 className="mt-1.5 font-serif text-lg font-bold leading-snug transition-colors">
        <Link href={href} className="hover:text-brand">
          {article.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
      <time dateTime={article.publishedAt} className="mt-2.5 text-xs text-muted">
        {formatDate(article.publishedAt)}
      </time>
    </article>
  );
}
