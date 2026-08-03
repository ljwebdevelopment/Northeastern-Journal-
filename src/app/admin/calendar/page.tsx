import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { ArticleStatus } from "@/lib/supabase/types";

export const metadata = { title: "Calendar" };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DOT: Partial<Record<ArticleStatus, string>> = {
  published: "bg-emerald-500",
  scheduled: "bg-amber-500",
  in_review: "bg-sky-500",
};

/**
 * What ran, and what is about to.
 *
 * A month grid answers questions a list can't: whether next week is empty,
 * whether three big pieces are stacked on the same morning, whether a section
 * has gone quiet. It reads published and scheduled dates together, because for
 * planning purposes the past and the future are the same calendar.
 *
 * Dates are rendered in UTC. A newsroom in one timezone would rather see one
 * consistent grid than have a piece scheduled for 11pm appear on the wrong day
 * depending on who is looking.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  await requireNewsroomUser("/admin/calendar");

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const anchor = parseMonth(month);
  const start = new Date(Date.UTC(anchor.year, anchor.month, 1));
  const end = new Date(Date.UTC(anchor.year, anchor.month + 1, 1));

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, status, published_at, scheduled_for, author:authors(name)")
    .or(
      `and(published_at.gte.${start.toISOString()},published_at.lt.${end.toISOString()}),` +
        `and(scheduled_for.gte.${start.toISOString()},scheduled_for.lt.${end.toISOString()})`
    )
    .limit(400);

  // Bucket by day. `scheduled_for` wins for a piece that hasn't run yet;
  // `published_at` is the truth for one that has.
  const byDay = new Map<number, typeof articles>();
  for (const article of articles ?? []) {
    const when =
      article.status === "scheduled" ? article.scheduled_for : article.published_at;
    if (!when) continue;
    const day = new Date(when).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), article]);
  }

  const daysInMonth = new Date(Date.UTC(anchor.year, anchor.month + 1, 0)).getUTCDate();
  const leadingBlanks = start.getUTCDay();
  const today = new Date();
  const isThisMonth =
    today.getUTCFullYear() === anchor.year && today.getUTCMonth() === anchor.month;

  const label = start.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">{label}</h1>
        </div>

        <nav className="flex items-center gap-1" aria-label="Change month">
          <MonthLink month={shift(anchor, -1)} label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </MonthLink>
          <Link
            href="/admin/calendar"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground"
          >
            This month
          </Link>
          <MonthLink month={shift(anchor, 1)} label="Next month">
            <ChevronRight className="h-4 w-4" />
          </MonthLink>
        </nav>
      </header>

      <p className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <Key className="bg-emerald-500" label="Published" />
        <Key className="bg-amber-500" label="Scheduled" />
        <Key className="bg-sky-500" label="In review" />
      </p>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[46rem]">
          <div className="grid grid-cols-7 gap-px text-xs font-bold uppercase tracking-wider text-muted">
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} className="min-h-28 bg-surface-muted/30" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const entries = byDay.get(day) ?? [];
              const isToday = isThisMonth && today.getUTCDate() === day;

              return (
                <div key={day} className="min-h-28 bg-surface p-2">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday ? "bg-brand text-brand-foreground" : "text-muted"
                    )}
                  >
                    {day}
                  </span>

                  <ul className="mt-1 space-y-1">
                    {entries.slice(0, 4).map((article) => {
                      const author = article.author as unknown as { name: string } | null;
                      return (
                        <li key={article.id}>
                          <Link
                            href={`/admin/articles/${article.id}`}
                            title={`${article.title}${author ? ` — ${author.name}` : ""}`}
                            className="flex items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug transition-colors hover:bg-surface-muted"
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                DOT[article.status] ?? "bg-muted"
                              )}
                            />
                            <span className="line-clamp-2">{article.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                    {entries.length > 4 && (
                      <li className="px-1 text-xs text-muted">
                        +{entries.length - 4} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(articles ?? []).length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">
            Nothing published or scheduled in {label}.
          </p>
        </div>
      )}
    </div>
  );
}

function MonthLink({
  month,
  label,
  children,
}: {
  month: { year: number; month: number };
  label: string;
  children: React.ReactNode;
}) {
  const value = `${month.year}-${String(month.month + 1).padStart(2, "0")}`;
  return (
    <Link
      href={`/admin/calendar?month=${value}`}
      aria-label={label}
      className="rounded-lg border border-border p-2 text-muted transition-colors hover:border-brand hover:text-brand"
    >
      {children}
    </Link>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}

/** "2026-08" → the month it names; anything else → the current month. */
function parseMonth(raw: string | undefined): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  const now = new Date();
  if (!match) return { year: now.getUTCFullYear(), month: now.getUTCMonth() };

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11 || year < 2000 || year > 2100) {
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  }
  return { year, month };
}

/** Month arithmetic through Date, so December + 1 rolls the year over. */
function shift({ year, month }: { year: number; month: number }, by: number) {
  const d = new Date(Date.UTC(year, month + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}
