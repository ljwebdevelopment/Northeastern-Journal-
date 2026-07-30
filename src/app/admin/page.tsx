import Link from "next/link";
import { FileText, Mail, PenSquare, Clock, Send } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser } from "@/lib/auth/roles";
import { StatusBadge } from "@/components/admin/article-editor";
import { isResendConfigured } from "@/lib/email/resend";
import type { ArticleStatus } from "@/lib/supabase/types";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const user = await requireNewsroomUser();
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const isAdmin = user.profile.role === "admin";

  const [{ data: recent }, counts, subscriberCount, { data: lastSend }] =
    await Promise.all([
      supabase
        .from("articles")
        .select("id, title, status, published_at, scheduled_for, updated_at")
        .order("updated_at", { ascending: false })
        .limit(8),
      countsByStatus(supabase),
      isAdmin ? confirmedSubscribers(supabase) : Promise.resolve(0),
      isAdmin
        ? supabase
            .from("email_sends")
            .select("subject, succeeded, created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const firstName = (user.profile.full_name || user.email).split(/[\s@]/)[0];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">
            Good to see you, {firstName}
          </h1>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          <PenSquare className="h-4 w-4" /> Write an article
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published" value={counts.published} icon={FileText} href="/admin/articles?status=published" />
        <Stat label="Drafts" value={counts.draft} icon={PenSquare} href="/admin/articles?status=draft" />
        <Stat label="Scheduled" value={counts.scheduled} icon={Clock} href="/admin/articles?status=scheduled" />
        {isAdmin && (
          <Stat label="Subscribers" value={subscriberCount} icon={Mail} href="/admin/subscribers" />
        )}
      </div>

      {isAdmin && !isResendConfigured && (
        <p className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Resend isn&apos;t configured yet, so newsletter emails won&apos;t send. Add{" "}
          <code className="text-xs">RESEND_API_KEY</code> to your environment — see{" "}
          <code className="text-xs">docs/SETUP.md</code>.
        </p>
      )}

      {isAdmin && lastSend && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Send className="h-4 w-4 shrink-0" />
          Last announcement: <strong className="font-semibold text-foreground">{lastSend.subject}</strong> —{" "}
          {lastSend.succeeded.toLocaleString()} recipients,{" "}
          {new Date(lastSend.created_at).toLocaleDateString()}
        </p>
      )}

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-xl font-bold">Recently edited</h2>
          <Link href="/admin/articles" className="text-sm font-semibold text-accent hover:underline">
            All articles
          </Link>
        </div>

        {recent && recent.length > 0 ? (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {recent.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/60"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={a.status} scheduledFor={a.scheduled_for} />
                    <span className="text-xs text-muted">
                      {new Date(a.updated_at).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="font-serif text-lg font-bold">No articles yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Until you publish, the site shows its built-in placeholder
              archive. Your first real article replaces it automatically.
            </p>
            <Link
              href="/admin/articles/new"
              className="mt-5 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
            >
              Write the first one
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

type Supa = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

async function countsByStatus(supabase: Supa) {
  const statuses: ArticleStatus[] = ["published", "draft", "scheduled"];
  const results = await Promise.all(
    statuses.map((status) =>
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", status)
    )
  );
  return {
    published: results[0].count ?? 0,
    draft: results[1].count ?? 0,
    scheduled: results[2].count ?? 0,
  };
}

async function confirmedSubscribers(supabase: Supa) {
  const { count } = await supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed");
  return count ?? 0;
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className="mt-2 font-serif text-3xl font-bold">{value.toLocaleString()}</p>
    </Link>
  );
}
