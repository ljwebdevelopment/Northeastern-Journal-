import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Page links for an archive listing.
 *
 * Real links with real hrefs, not buttons: a reader can open page 3 in a new
 * tab, bookmark it, and a crawler can follow it into the archive. `page=1` is
 * dropped from the URL so the first page has exactly one address.
 */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  /** Path without the page parameter, e.g. "/category/politics". */
  basePath: string;
  /** Other query parameters to preserve, e.g. the search term. */
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-center gap-1 print:hidden"
    >
      <PageLink
        href={href(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        rel="prev"
      >
        <ChevronLeft className="h-4 w-4" />
      </PageLink>

      {pageNumbers(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} className="px-1.5 text-muted">
            …
          </span>
        ) : (
          <PageLink key={n} href={href(n)} current={n === page}>
            {n}
          </PageLink>
        )
      )}

      <PageLink
        href={href(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        rel="next"
      >
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current,
  disabled,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
} & React.ComponentProps<"a">) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors",
    current
      ? "bg-brand text-brand-foreground"
      : "text-foreground/80 hover:bg-surface-muted hover:text-foreground"
  );

  // A disabled arrow is not a link at all — rendering an <a> to nowhere would
  // put a dead stop in the tab order.
  if (disabled) {
    return (
      <span aria-hidden="true" className={cn(className, "opacity-30")}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={className} {...rest}>
      {children}
    </Link>
  );
}

/**
 * First, last, and a window around the current page; `null` marks an ellipsis.
 * Keeps the control a fixed width whether the archive has 5 pages or 500.
 */
function pageNumbers(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const out: (number | null)[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) out.push(null);
    out.push(n);
    previous = n;
  }
  return out;
}
