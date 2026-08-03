import Link from "next/link";
import type { Article } from "@/lib/content/types";
import { categories } from "@/lib/content/data";

/**
 * The scrolling rail under the masthead, carrying the newest stories.
 *
 * It used to carry only articles flagged `breaking`, which meant it was
 * usually absent and, when present, red. A standing rail of recent work is
 * more useful on most days, so the styling is deliberately quieter than the
 * old alarm bar — a red band that never goes away stops meaning "urgent".
 *
 * The `breaking` flag still does something: a story carrying it leads the
 * rail instead of waiting its turn by date. Editors keep the lever they had,
 * and the rail has something to show on the ordinary days when nothing is
 * breaking at all.
 *
 * The list is duplicated so the marquee can loop seamlessly: the animation
 * translates by exactly -50%, at which point the second copy sits where the
 * first began. Only the first copy is exposed to assistive tech.
 */
const categoryName = (slug: string) =>
  categories.find((c) => c.slug === slug)?.name ?? slug;

/** Roughly six seconds of travel per headline, with a sane floor. */
const durationFor = (count: number) => `${Math.max(24, count * 7)}s`;

export function LatestTicker({
  articles,
  limit = 8,
}: {
  articles: Article[];
  limit?: number;
}) {
  // Newest first (the source order), then breaking hoisted to the front with
  // their relative order intact.
  const latest = articles
    .slice(0, limit)
    .sort((a, b) => Number(Boolean(b.breaking)) - Number(Boolean(a.breaking)));

  if (latest.length === 0) return null;

  return (
    <div
      className="group border-b border-border bg-surface"
      role="region"
      aria-label="Latest stories"
    >
      <div className="content-container flex items-center gap-4 py-2">
        <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-accent">
          Latest
        </span>
        <div className="relative flex-1 overflow-hidden">
          {/* Paused on hover and while a headline holds focus, so a moving
              target doesn't have to be chased or tabbed past mid-scroll. */}
          <div
            className="flex w-max animate-ticker gap-10 whitespace-nowrap text-sm font-medium group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
            style={{ animationDuration: durationFor(latest.length) }}
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-10" aria-hidden={copy === 1}>
                {latest.map((a) => (
                  <Link
                    key={`${copy}-${a.slug}`}
                    href={`/article/${a.category}/${a.slug}`}
                    // The duplicate exists only to make the loop seamless; it
                    // must not be a second tab stop for the same headline.
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="text-foreground/80 transition-colors hover:text-accent"
                  >
                    <span className="text-accent">{categoryName(a.category)}</span>
                    <span className="mx-2 text-muted">·</span>
                    {a.title}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
