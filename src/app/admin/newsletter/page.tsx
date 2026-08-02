import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, PenSquare, Send } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser, isStaff } from "@/lib/auth/roles";
import { isResendConfigured } from "@/lib/email/resend";
import { cn } from "@/lib/utils";
import { createIssueForm } from "./actions";
import type { NewsletterIssueRow } from "@/lib/supabase/types";

export const metadata = { title: "Newsletter" };

export default async function NewsletterIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.profile.role)) redirect("/admin?error=admin-only");

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { notice } = await searchParams;

  const [{ data: issues, error }, subscriberCount] = await Promise.all([
    supabase
      .from("newsletter_issues")
      .select("*")
      .order("issue_number", { ascending: false })
      .limit(50),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .then((r) => r.count ?? 0),
  ]);

  const rows = (issues ?? []) as NewsletterIssueRow[];
  const draft = rows.find((i) => i.status === "draft");

  /*
   * The table arrives with migration 0010. Until it has been run, every query
   * here 404s and the page would otherwise show a cheerful "no issues yet" —
   * which sends an editor looking for a bug in the wrong place.
   */
  const migrationMissing =
    Boolean(error) &&
    (error!.message.includes("newsletter_issues") ||
      error!.message.includes("does not exist") ||
      error!.code === "42P01");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Newsletter</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            The Sunday Letter goes out to{" "}
            <strong className="font-semibold text-foreground">
              {subscriberCount.toLocaleString()}
            </strong>{" "}
            confirmed subscriber{subscriberCount === 1 ? "" : "s"}. Each issue
            is assembled for you from the week&apos;s new reporting and what
            readers are actually reading — write the note, check the preview,
            send.
          </p>
        </div>

        {draft ? (
          <Link
            href={`/admin/newsletter/${draft.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
          >
            <PenSquare className="h-4 w-4" /> Continue draft
          </Link>
        ) : (
          <form action={createIssueForm}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
            >
              <PenSquare className="h-4 w-4" /> Compose this week&apos;s issue
            </button>
          </form>
        )}
      </header>

      {notice && (
        <p role="status" className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          {notice}
        </p>
      )}

      {migrationMissing && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm leading-relaxed text-brand">
          The <code className="text-xs">newsletter_issues</code> table
          doesn&apos;t exist yet. Run{" "}
          <code className="text-xs">
            supabase/migrations/0010_newsletter_issues.sql
          </code>{" "}
          in Supabase Dashboard → SQL Editor, then reload this page.
        </p>
      )}

      {!isResendConfigured && (
        <p className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Resend isn&apos;t configured — you can compose and preview issues, but
          nothing will send. Add <code className="text-xs">RESEND_API_KEY</code>{" "}
          to finish the setup.
        </p>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-lg font-bold">Issues</h2>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted">
              No issues yet. Composing one pulls in everything published since
              your last send.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {rows.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/admin/newsletter/${issue.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-4 hover:bg-surface-muted/60"
                >
                  <span className="w-16 shrink-0 font-serif text-sm font-bold text-muted">
                    No. {issue.issue_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{issue.title}</span>

                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      issue.status === "sent"
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {issue.status === "sent" ? "Sent" : "Draft"}
                  </span>

                  <span className="shrink-0 text-xs text-muted">
                    {issue.status === "sent" && issue.sent_at ? (
                      <>
                        <Send className="mr-1 inline h-3 w-3" aria-hidden="true" />
                        {issue.succeeded.toLocaleString()} delivered
                        {issue.failed > 0 && ` · ${issue.failed} failed`} ·{" "}
                        {new Date(issue.sent_at).toLocaleDateString()}
                      </>
                    ) : (
                      `Started ${new Date(issue.created_at).toLocaleDateString()}`
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
