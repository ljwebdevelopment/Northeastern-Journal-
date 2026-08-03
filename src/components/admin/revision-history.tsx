import { History } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { restoreRevisionForm } from "@/app/admin/actions";
import { ConfirmSubmit } from "./confirm-submit";
import type { RevisionKind } from "@/lib/supabase/types";

const KIND_LABEL: Record<RevisionKind, string> = {
  autosave: "Autosave",
  manual: "Saved",
  publish: "Published",
};

/**
 * Every version of the prose, newest first, each restorable.
 *
 * The word count delta is the useful column, not the timestamp: "−600 words"
 * is how you spot the save that ate three paragraphs, and it is the reason
 * anyone opens this panel in the first place.
 */
export async function RevisionHistory({ articleId }: { articleId: string }) {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: revisions } = await supabase
    .from("article_revisions")
    .select("id, kind, title, word_count, created_at, author:profiles(full_name, email)")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!revisions || revisions.length === 0) return null;

  return (
    <section className="mx-auto mt-6 max-w-5xl rounded-xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
        <History className="h-4 w-4 text-muted" /> Version history
      </h2>
      <p className="mt-1 text-sm text-muted">
        Restoring keeps what you replace — it is added to this list first, so
        nothing here is a one-way door.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {revisions.map((rev, i) => {
          const previous = revisions[i + 1];
          const delta = previous ? rev.word_count - previous.word_count : null;
          const author = rev.author as unknown as {
            full_name: string | null;
            email: string;
          } | null;

          return (
            <li key={rev.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{rev.title || "Untitled"}</span>
                <span className="ml-2 text-xs text-muted">
                  {KIND_LABEL[rev.kind]} · {author?.full_name || author?.email || "—"}
                </span>
              </span>

              <span className="shrink-0 text-xs text-muted">
                {rev.word_count.toLocaleString()} words
                {delta !== null && delta !== 0 && (
                  <span className={delta < 0 ? "ml-1.5 text-brand" : "ml-1.5 text-muted"}>
                    {delta > 0 ? "+" : ""}
                    {delta.toLocaleString()}
                  </span>
                )}
              </span>

              <span className="hidden w-40 shrink-0 text-right text-xs text-muted sm:block">
                {new Date(rev.created_at).toLocaleString()}
              </span>

              {/* The current text is snapshotted before the swap, so this is
                  reversible — but it still replaces what is on screen, which
                  is worth one confirmation. */}
              <form action={restoreRevisionForm} className="shrink-0">
                <input type="hidden" name="id" value={articleId} />
                <input type="hidden" name="revision_id" value={rev.id} />
                <ConfirmSubmit
                  message={`Replace the current text with the version from ${new Date(
                    rev.created_at
                  ).toLocaleString()}? The text you have now is kept in the history.`}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                >
                  Restore
                </ConfirmSubmit>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
