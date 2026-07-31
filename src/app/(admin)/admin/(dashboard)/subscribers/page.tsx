import type { Metadata } from "next";
import { Download } from "lucide-react";
import { listSubscribers, subscriberStats } from "@/lib/store/subscribers";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const [subscribers, stats] = await Promise.all([listSubscribers(), subscriberStats()]);
  const recent = subscribers.slice(0, 100);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Subscriber Experience</p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold">Subscribers</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Readers are added the instant they submit the form — no double
            opt-in. Unsubscribes are kept on file so an opt-out is never lost.
          </p>
        </div>
        {subscribers.length > 0 && (
          <a
            href="/admin/subscribers/export"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </a>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Active", stats.active],
          ["New (30 days)", stats.last30Days],
          ["Unsubscribed", stats.unsubscribed],
          ["Total", stats.total],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {label}
            </p>
            <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
        {recent.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No signups yet. Every subscription from the site lands here.
          </p>
        ) : (
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Subscribed</th>
                <th className="px-5 py-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((subscriber) => (
                <tr key={subscriber.email}>
                  <td className="px-5 py-3 font-medium">{subscriber.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        subscriber.status === "subscribed"
                          ? "rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand"
                          : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted"
                      }
                    >
                      {subscriber.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted">{formatDate(subscriber.subscribedAt)}</td>
                  <td className="px-5 py-3 text-muted">{subscriber.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {subscribers.length > recent.length && (
        <p className="mt-4 text-xs text-muted">
          Showing the {recent.length} most recent of {subscribers.length}. Export
          the CSV for the full list.
        </p>
      )}
    </div>
  );
}
