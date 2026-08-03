import Link from "next/link";
import { Inbox } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser, canPublish } from "@/lib/auth/roles";
import { ReviewThread } from "@/components/admin/review-thread";

export const metadata = { title: "Review queue" };

/**
 * Whole days between then and now.
 *
 * Module scope rather than inline: reading the clock is not something a render
 * should do, and pulling it out here keeps that boundary obvious (and the
 * purity lint rule satisfied) even though this page only ever runs on the
 * server.
 */
function daysSince(iso: string): number {
  return Math.floor((Date.now() - +new Date(iso)) / 86_400_000);
}

/**
 * The desk's inbox.
 *
 * Everyone who can write sees this page, not just editors — a contributor
 * needs somewhere to watch their own submission and answer a change request.
 * RLS already limits the rows and the threads they can see, so the same page
 * serves both without a second implementation.
 */
export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const user = await requireNewsroomUser("/admin/review");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const mayDecide = canPublish(user.profile.role);

  const { data: queue } = await supabase
    .from("articles")
    .select(
      "id, title, slug, updated_at, word_count, reading_minutes, preview_token, category:categories(name), author:authors(name)"
    )
    .eq("status", "in_review")
    .order("updated_at", { ascending: true })
    .limit(50);

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Review queue</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {mayDecide
            ? "Pieces waiting on the desk, oldest first. Approving publishes; returning sends it back to the writer with your note."
            : "Your work waiting on the desk. You'll see the editor's reply here."}
        </p>
      </header>

      {notice && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">{notice}</p>
      )}

      {queue && queue.length > 0 ? (
        <div className="mt-8 space-y-8">
          {queue.map((article) => {
            const category = article.category as unknown as { name: string } | null;
            const author = article.author as unknown as { name: string } | null;
            const waited = daysSince(article.updated_at);

            return (
              <article
                key={article.id}
                className="overflow-hidden rounded-xl border border-border"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-muted/40 px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl font-bold">
                      <Link href={`/admin/articles/${article.id}`} className="hover:text-brand">
                        {article.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {[category?.name, author?.name].filter(Boolean).join(" · ") || "Unfiled"} ·{" "}
                      {article.word_count.toLocaleString()} words · {article.reading_minutes} min
                      read · waiting{" "}
                      {waited === 0 ? "since today" : `${waited} day${waited === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/preview/${article.preview_token}`}
                      target="_blank"
                      className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand"
                    >
                      Read it
                    </Link>
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {/* The thread carries its own spacing; strip the section's
                    outer card so it reads as part of this row. */}
                <div className="[&>section]:mx-0 [&>section]:mt-0 [&>section]:max-w-none [&>section]:rounded-none [&>section]:border-0">
                  <ReviewThread
                    articleId={article.id}
                    canDecide={mayDecide}
                    inReview
                    returnTo="/admin/review"
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 font-serif text-lg font-bold">Nothing waiting</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            When a writer presses “Send to desk”, their piece lands here with
            whatever they wanted you to know about it.
          </p>
        </div>
      )}
    </div>
  );
}
