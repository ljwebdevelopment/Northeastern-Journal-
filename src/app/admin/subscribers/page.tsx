import { Download } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import { isResendConfigured } from "@/lib/email/resend";
import { cn } from "@/lib/utils";
import type { SubscriberStatus } from "@/lib/supabase/types";

export const metadata = { title: "Subscribers" };

const STATUS_STYLES: Record<SubscriberStatus, string> = {
  confirmed: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  unsubscribed: "bg-surface-muted text-muted",
  bounced: "bg-brand/10 text-brand",
};

export default async function SubscribersPage() {
  await requireAdmin("/admin/subscribers");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const statuses: SubscriberStatus[] = ["confirmed", "pending", "unsubscribed", "bounced"];

  const [counts, { data: recent }, { data: sends }] = await Promise.all([
    Promise.all(
      statuses.map((s) =>
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", s)
          .then((r) => r.count ?? 0)
      )
    ),
    supabase
      .from("subscribers")
      .select("email, status, source, frequency, created_at, confirmed_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("email_sends")
      .select("subject, recipients, succeeded, failed, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const [confirmed, pending, unsubscribed, bounced] = counts;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Subscribers</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Readers are subscribed the moment they submit the form, and every
            message carries a one-click unsubscribe link. Addresses are never
            shown to the public or shared.
          </p>
        </div>

        {/* A plain link, not a fetch: the browser's own download handling is
            better than anything reimplemented here. */}
        <a
          href="/admin/subscribers/export"
          download
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </header>

      {!isResendConfigured && (
        <p className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Resend isn&apos;t configured — signups are stored, but no confirmation
          emails go out. Add <code className="text-xs">RESEND_API_KEY</code> to
          finish the setup.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Confirmed" value={confirmed} emphasis />
        {/* Signup is single opt-in now (migration 0006), so anything still
            'pending' predates that change and never finished the old flow. */}
        <Stat label="Pending (legacy)" value={pending} />
        <Stat label="Unsubscribed" value={unsubscribed} />
        <Stat label="Bounced" value={bounced} />
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-bold">Recent signups</h2>
        {recent && recent.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Email</th>
                  <th scope="col" className="px-4 py-3 font-bold">Status</th>
                  <th scope="col" className="px-4 py-3 font-bold">Cadence</th>
                  <th scope="col" className="px-4 py-3 font-bold">Source</th>
                  <th scope="col" className="px-4 py-3 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((s) => (
                  <tr key={s.email}>
                    <td className="px-4 py-3">{s.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          STATUS_STYLES[s.status]
                        )}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{s.frequency}</td>
                    <td className="px-4 py-3 text-muted">{s.source}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
            No signups yet. The form on the newsletter page feeds this list.
          </p>
        )}
      </section>

      {sends && sends.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg font-bold">Announcements sent</h2>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {sends.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1 truncate font-medium">{s.subject}</span>
                <span className="text-xs text-muted">
                  {s.succeeded.toLocaleString()} delivered
                  {s.failed > 0 && ` · ${s.failed} failed`}
                </span>
                <span className="text-xs text-muted">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        emphasis ? "border-brand/30 bg-brand/5" : "border-border bg-surface"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
