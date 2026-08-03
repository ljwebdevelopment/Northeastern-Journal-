import Link from "next/link";
import { MailOpen } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser, canPublish } from "@/lib/auth/roles";
import { moderateLetterForm } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { LetterStatus } from "@/lib/supabase/types";

export const metadata = { title: "Letters" };

const FILTERS: { value: LetterStatus | "all"; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Declined" },
  { value: "all", label: "All" },
];

/**
 * The letters desk.
 *
 * Approving publishes a letter to /letters immediately — the public view only
 * ever shows approved rows. Declining keeps the letter (a record of what
 * arrived, and of the decision) but publishes nothing.
 */
export default async function AdminLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const user = await requireNewsroomUser("/admin/letters");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  // Reading letters means reading readers' email addresses; that is an
  // editor's job, not a contributor's.
  if (!canPublish(user.profile.role)) {
    return (
      <p className="mx-auto max-w-2xl rounded-xl border border-border bg-surface px-6 py-12 text-center text-sm text-muted">
        Letters are handled by editors and administrators.
      </p>
    );
  }

  let query = supabase
    .from("letters")
    .select("*, article:articles(slug, title)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status as LetterStatus);

  const { data: letters, error } = await query;

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Letters</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Approving puts a letter on{" "}
          <Link href="/letters" className="text-accent hover:underline">
            the letters page
          </Link>{" "}
          straight away, without the writer&apos;s email address. Declining keeps
          it here and publishes nothing.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-1" aria-label="Filter letters">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/letters?status=${f.value}`}
            aria-current={status === f.value ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              status === f.value
                ? "bg-brand text-brand-foreground"
                : "text-muted hover:bg-surface-muted"
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          Couldn&apos;t load letters: {error.message}
        </p>
      )}

      {letters && letters.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {letters.map((letter) => {
            const article = letter.article as unknown as {
              slug: string;
              title: string;
            } | null;

            return (
              <li key={letter.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg font-bold">
                      {letter.subject || "(no subject)"}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {letter.name}
                      {letter.location && `, ${letter.location}`} ·{" "}
                      <a href={`mailto:${letter.email}`} className="hover:text-brand">
                        {letter.email}
                      </a>{" "}
                      · {new Date(letter.created_at).toLocaleString()}
                    </p>
                    {article && (
                      <p className="mt-1 text-xs text-muted">
                        Responding to <span className="font-semibold">{article.title}</span>
                      </p>
                    )}
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      letter.status === "approved"
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                        : letter.status === "rejected"
                          ? "bg-surface-muted text-muted line-through"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {letter.status === "approved"
                      ? "Published"
                      : letter.status === "rejected"
                        ? "Declined"
                        : "Waiting"}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{letter.body}</p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {letter.status !== "approved" && (
                    <ModerateButton id={letter.id} status="approved" label="Publish it" primary />
                  )}
                  {letter.status !== "rejected" && (
                    <ModerateButton id={letter.id} status="rejected" label="Decline" />
                  )}
                  {letter.status !== "pending" && (
                    <ModerateButton id={letter.id} status="pending" label="Back to waiting" />
                  )}
                  <a
                    href={`mailto:${letter.email}?subject=${encodeURIComponent(
                      `Your letter to the Northeastern Journal${letter.subject ? `: ${letter.subject}` : ""}`
                    )}`}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand"
                  >
                    Reply by email
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <MailOpen className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 font-serif text-lg font-bold">Nothing here</p>
          <p className="mt-2 text-sm text-muted">
            {status === "pending"
              ? "No letters are waiting on a decision."
              : "No letters with that status."}
          </p>
        </div>
      )}
    </div>
  );
}

function ModerateButton({
  id,
  status,
  label,
  primary,
}: {
  id: string;
  status: LetterStatus;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={moderateLetterForm}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        className={cn(
          "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
          primary
            ? "bg-brand text-brand-foreground hover:opacity-90"
            : "border border-border hover:border-brand hover:text-brand"
        )}
      >
        {label}
      </button>
    </form>
  );
}
