import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/content/types";
import { categories } from "@/lib/content/data";
import { formatDate, cn } from "@/lib/utils";

const categoryName = (slug: string) =>
  categories.find((c) => c.slug === slug)?.name ?? slug;

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
      <article className="flex gap-3 py-3">
        <Link
          href={href}
          className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-surface-muted"
        >
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="80px"
            className="object-cover"
          />
        </Link>
        <div className="min-w-0">
          <p className="kicker">{categoryName(article.category)}</p>
          <h3 className="mt-1 line-clamp-2 font-serif text-sm font-semibold leading-snug">
            <Link href={href} className="hover:text-accent">
              {article.title}
            </Link>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === "horizontal") {
    return (
      <article className="group grid grid-cols-[9rem_1fr] gap-4 sm:grid-cols-[12rem_1fr]">
        <Link
          href={href}
          className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted"
        >
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="flex flex-col justify-center">
          <p className="kicker">{categoryName(article.category)}</p>
          <h3 className="mt-1 font-serif text-lg font-bold leading-snug">
            <Link href={href} className="hover:text-accent">
              {article.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {article.excerpt}
          </p>
          <time
            dateTime={article.publishedAt}
            className="mt-2 text-xs text-muted"
          >
            {formatDate(article.publishedAt)}
          </time>
        </div>
      </article>
    );
  }

  if (variant === "hero") {
    return (
      <article className="group relative overflow-hidden rounded-2xl">
        <Link href={href} className="relative block aspect-[16/10] w-full">
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="(min-width: 1024px) 66vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="kicker text-white/90">{categoryName(article.category)}</p>
          <h1 className="mt-2 max-w-2xl text-balance font-serif text-2xl font-bold leading-tight text-white sm:text-4xl">
            <Link href={href}>{article.title}</Link>
          </h1>
          <p className="mt-3 hidden max-w-xl text-sm text-white/80 sm:block">
            {article.excerpt}
          </p>
          <time dateTime={article.publishedAt} className="mt-3 block text-xs text-white/70">
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
        className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted"
      >
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <p className="kicker mt-3">{categoryName(article.category)}</p>
      <h3 className="mt-1 font-serif text-lg font-bold leading-snug">
        <Link href={href} className="hover:text-accent">
          {article.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
      <time dateTime={article.publishedAt} className="mt-2 text-xs text-muted">
        {formatDate(article.publishedAt)}
      </time>
    </article>
  );
}
