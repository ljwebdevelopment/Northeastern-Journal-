import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser, canPublish } from "@/lib/auth/roles";
import { formatViews } from "@/lib/format-views";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

/**
 * What the newsroom is actually being read.
 *
 * The lifetime total on the articles list answers "is this popular?"; nothing
 * answered "is anyone reading us this week?", which is the question that
 * changes what gets commissioned. Both charts read `article_views_daily`,
 * written by the same function that increments the lifetime counter, so the
 * two can never disagree.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam) as (typeof RANGES)[number])
    ? Number(daysParam)
    : 30;

  const user = await requireNewsroomUser("/admin/analytics");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  if (!canPublish(user.profile.role)) {
    return (
      <p className="mx-auto max-w-2xl rounded-xl border border-border bg-surface px-6 py-12 text-center text-sm text-muted">
        Traffic figures are visible to editors and administrators.
      </p>
    );
  }

  const [{ data: daily }, { data: top }, { count: published }, { count: subscribers }] =
    await Promise.all([
      supabase.rpc("daily_reads", { days }),
      supabase.rpc("top_articles", { days, limit_count: 10 }),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
    ]);

  const series = daily ?? [];
  const total = series.reduce((sum, d) => sum + Number(d.views), 0);
  const peak = Math.max(1, ...series.map((d) => Number(d.views)));

  // Compare like with like: the same number of days immediately before.
  const half = Math.floor(series.length / 2);
  const recent = series.slice(half).reduce((s, d) => s + Number(d.views), 0);
  const previous = series.slice(0, half).reduce((s, d) => s + Number(d.views), 0);
  const trend = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Analytics</h1>
        </div>
        <nav className="flex gap-1" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?days=${r}`}
              aria-current={days === r ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                days === r ? "bg-brand text-brand-foreground" : "text-muted hover:bg-surface-muted"
              )}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label={`Reads · last ${days} days`} value={formatViews(total)} />
        <Stat label="Published articles" value={(published ?? 0).toLocaleString()} />
        <Stat label="Confirmed subscribers" value={(subscribers ?? 0).toLocaleString()} />
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Reads over time                                                  */}
      {/* --------------------------------------------------------------- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-bold">Reads per day</h2>
          {trend !== null && (
            <p className="text-sm text-muted">
              Second half of the period vs. the first:{" "}
              <span
                className={cn(
                  "font-semibold",
                  trend > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : trend < 0
                      ? "text-brand"
                      : ""
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </span>
            </p>
          )}
        </div>

        {total > 0 ? (
          /* A bar per day. Plain elements rather than a charting library: the
             data is one number per day, and the accessible table below is the
             real answer for anyone who can't see the bars. */
          <>
            <div
              className="mt-5 flex h-40 items-end gap-[2px] rounded-xl border border-border bg-surface p-4"
              aria-hidden="true"
            >
              {series.map((d) => (
                <div
                  key={d.day}
                  title={`${new Date(d.day).toLocaleDateString()}: ${d.views} reads`}
                  style={{ height: `${Math.max(2, (Number(d.views) / peak) * 100)}%` }}
                  className="min-w-[3px] flex-1 rounded-t bg-brand/70 transition-colors hover:bg-brand"
                />
              ))}
            </div>
            <p className="mt-2 flex justify-between text-xs text-muted">
              <span>{new Date(series[0].day).toLocaleDateString()}</span>
              <span>Peak {peak.toLocaleString()} in a day</span>
              <span>{new Date(series[series.length - 1].day).toLocaleDateString()}</span>
            </p>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm text-muted">
              No reads recorded in this period yet. Counting starts the first
              time someone opens a published article.
            </p>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------------- */}
      {/* Most read                                                        */}
      {/* --------------------------------------------------------------- */}
      {top && top.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl font-bold">Most read</h2>
          <ol className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {top.map((article, i) => (
              <li
                key={article.article_id}
                className="flex items-center gap-4 px-4 py-3 text-sm"
              >
                <span className="w-5 shrink-0 text-right font-serif font-bold text-muted">
                  {i + 1}
                </span>
                <Link
                  href={`/admin/articles/${article.article_id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:text-brand"
                >
                  {article.title}
                </Link>
                {article.category_slug && (
                  <span className="hidden shrink-0 text-xs text-muted sm:block">
                    {article.category_slug}
                  </span>
                )}
                <span className="w-20 shrink-0 text-right text-xs text-muted">
                  {formatViews(Number(article.views))} reads
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-10 text-xs leading-relaxed text-muted">
        Reads are counted server-side when an article page is opened, one per
        request. There is no third-party analytics script, no cookie, and no
        cross-site tracking — which also means these numbers are honest but
        coarse: a refresh counts twice, and a crawler counts once.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
    </div>
  );
}
