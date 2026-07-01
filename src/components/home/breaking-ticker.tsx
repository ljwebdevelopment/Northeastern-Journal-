import Link from "next/link";
import type { Article } from "@/lib/content/types";

export function BreakingTicker({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  const items = [...articles, ...articles];

  return (
    <div
      className="border-b border-border bg-accent text-accent-foreground"
      role="region"
      aria-label="Breaking news"
    >
      <div className="content-container flex items-center gap-4 py-2">
        <span className="shrink-0 rounded-full bg-accent-foreground/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
          Breaking
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex w-max animate-ticker gap-10 whitespace-nowrap text-sm font-medium">
            {items.map((a, i) => (
              <Link
                key={`${a.slug}-${i}`}
                href={`/article/${a.category}/${a.slug}`}
                className="hover:underline"
              >
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
