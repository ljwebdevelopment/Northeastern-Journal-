import { CheckCircle2, MessageSquare, RotateCcw, Send } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { reviewDecisionForm, resolveNoteForm } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { EditorialNoteKind } from "@/lib/supabase/types";

/**
 * The conversation about a piece: who sent it in, what the desk asked for, and
 * whether it was ever answered.
 *
 * Rendered outside the editor's <form> on purpose — the decision buttons are
 * forms of their own, and a form inside a form is invalid HTML that browsers
 * resolve by silently dropping the inner one.
 */

const KIND_META: Record<EditorialNoteKind, { label: string; className: string }> = {
  submitted: { label: "Sent to the desk", className: "text-sky-700 dark:text-sky-400" },
  changes_requested: { label: "Changes requested", className: "text-brand" },
  approved: { label: "Approved", className: "text-emerald-700 dark:text-emerald-400" },
  comment: { label: "Comment", className: "text-muted" },
};

export async function ReviewThread({
  articleId,
  canDecide,
  inReview,
  returnTo,
}: {
  articleId: string;
  /** Editors and admins decide; contributors can still reply. */
  canDecide: boolean;
  inReview: boolean;
  returnTo: string;
}) {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: notes } = await supabase
    .from("editorial_notes")
    .select("id, kind, body, resolved_at, created_at, author:profiles(full_name, email)")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(50);

  const open = (notes ?? []).filter(
    (n) => n.kind === "changes_requested" && !n.resolved_at
  ).length;

  return (
    <section className="mx-auto mt-10 max-w-5xl rounded-xl border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-bold">Review</h2>
        {open > 0 && (
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
            {open} unresolved change request{open === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Decisions                                                      */}
      {/* ------------------------------------------------------------- */}
      {canDecide && inReview && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <form action={reviewDecisionForm} className="rounded-lg border border-border p-3">
            <input type="hidden" name="id" value={articleId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="decision" value="publish" />
            <p className="text-sm font-semibold">Approve and publish</p>
            <textarea
              name="note"
              rows={2}
              placeholder="Optional note for the writer."
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90">
              <CheckCircle2 className="h-3.5 w-3.5" /> Publish
            </button>
          </form>

          <form action={reviewDecisionForm} className="rounded-lg border border-border p-3">
            <input type="hidden" name="id" value={articleId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="decision" value="changes" />
            <p className="text-sm font-semibold">Send back for changes</p>
            <textarea
              name="note"
              rows={2}
              required
              placeholder="What needs to change, and why. Required."
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand">
              <RotateCcw className="h-3.5 w-3.5" /> Return to the writer
            </button>
          </form>
        </div>
      )}

      {/* Anyone on the thread can talk. */}
      <form action={reviewDecisionForm} className="mt-4">
        <input type="hidden" name="id" value={articleId} />
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="decision" value="comment" />
        <label htmlFor={`note-${articleId}`} className="sr-only">
          Add a comment
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`note-${articleId}`}
            name="note"
            placeholder="Add a note to the thread…"
            className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-brand"
          />
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand">
            <Send className="h-3.5 w-3.5" /> Post
          </button>
        </div>
      </form>

      {/* ------------------------------------------------------------- */}
      {/* History                                                        */}
      {/* ------------------------------------------------------------- */}
      {notes && notes.length > 0 ? (
        <ol className="mt-5 space-y-3 border-t border-border pt-4">
          {notes.map((note) => {
            const meta = KIND_META[note.kind];
            const author = note.author as unknown as {
              full_name: string | null;
              email: string;
            } | null;
            return (
              <li key={note.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-xs font-bold uppercase tracking-wider", meta.className)}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted">
                    {author?.full_name || author?.email || "Someone"} ·{" "}
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                  {note.resolved_at && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">Resolved</span>
                  )}
                  {canDecide && note.kind === "changes_requested" && !note.resolved_at && (
                    <form action={resolveNoteForm}>
                      <input type="hidden" name="note_id" value={note.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button className="text-xs font-semibold text-muted hover:text-brand">
                        Mark resolved
                      </button>
                    </form>
                  )}
                </div>
                {note.body && (
                  <p className="mt-1 whitespace-pre-line leading-relaxed">{note.body}</p>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted">
          <MessageSquare className="h-4 w-4" />
          Nothing here yet.
        </p>
      )}
    </section>
  );
}
