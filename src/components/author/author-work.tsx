import Image from "next/image";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";

export type WorkKind = "article" | "column" | "book" | "conversation";
export type WorkRole = "Byline" | "Co-author" | "Author" | "Participant" | "Tagged" | "Mentioned";

/** One entry on a profile's work list, whatever kind of piece it is. */
export interface WorkItem {
  key: string;
  kind: WorkKind;
  role: WorkRole;
  title: string;
  href: string;
  publishedAt: string;
  excerpt?: string;
  image?: string;
  imageAlt?: string;
  /** Section the piece ran in, e.g. "Opinion". */
  section?: string;
}

export const KIND_LABELS: Record<WorkKind, { one: string; many: string }> = {
  article: { one: "Article", many: "Articles" },
  column: { one: "Column", many: "Columns" },
  book: { one: "Book", many: "Books" },
  conversation: { one: "Conversation", many: "Conversations" },
};

const ROLE_STYLES: Record<WorkRole, string> = {
  Byline: "border-border text-muted",
  Author: "border-border text-muted",
  "Co-author": "border-brand/40 bg-brand/5 text-brand",
  Participant: "border-brand/40 bg-brand/5 text-brand",
  Tagged: "border-brand/40 bg-brand/5 text-brand",
  Mentioned: "border-border bg-surface-muted text-foreground/75",
};

/**
 * Tab strip for the profile's work section. Real links, not client state, so
 * each tab has an address a reader can share and a crawler can follow.
 */
export function WorkTabs({
  tabs,
}: {
  tabs: { label: string; count: number; href: string; active: boolean }[];
}) {
  return (
    <nav
      aria-label="Work by relationship"
      className="flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          scroll={false}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
            tab.active
              ? "border-brand text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
              tab.active ? "bg-brand text-brand-foreground" : "bg-surface-muted text-muted"
            )}
          >
            {tab.count}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/** Filter chips for narrowing a tab to one kind of work. */
export function WorkFilters({
  filters,
}: {
  filters: { label: string; count: number; href: string; active: boolean }[];
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
      {filters.map((f) => (
        <Link
          key={f.label}
          href={f.href}
          scroll={false}
          aria-current={f.active ? "true" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            f.active
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border text-muted hover:border-brand hover:text-brand"
          )}
        >
          {f.label} <span className="tabular-nums opacity-75">({f.count})</span>
        </Link>
      ))}
    </div>
  );
}

export function WorkList({ items, empty }: { items: WorkItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="mt-8 text-sm text-muted">{empty}</p>;
  }

  return (
    <ul className="mt-6 flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.key}>
          <Link href={item.href} className="group flex gap-4 py-4 sm:gap-5">
            {item.image && (
              <span
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted",
                  item.kind === "book" ? "h-24 w-16" : "h-16 w-20 sm:h-20 sm:w-28"
                )}
              >
                <Image
                  src={item.image}
                  alt={item.imageAlt ?? ""}
                  fill
                  sizes="112px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-wide">
                <span className="text-brand">{item.section ?? KIND_LABELS[item.kind].one}</span>
                {item.section && item.kind !== "article" && (
                  <span className="text-muted">· {KIND_LABELS[item.kind].one}</span>
                )}
                <span className={cn("rounded-full border px-2 py-0.5 normal-case tracking-normal", ROLE_STYLES[item.role])}>
                  {item.role}
                </span>
              </span>
              <span className="mt-1.5 block font-serif text-base font-bold leading-snug transition-colors group-hover:text-brand sm:text-lg">
                {item.title}
              </span>
              {item.excerpt && (
                <span className="mt-1 line-clamp-2 block text-sm text-muted">{item.excerpt}</span>
              )}
              <time dateTime={item.publishedAt} className="mt-1.5 block text-xs text-muted">
                {formatDate(item.publishedAt)}
              </time>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
