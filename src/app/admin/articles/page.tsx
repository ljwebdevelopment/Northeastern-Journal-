import Link from "next/link";
import { PenSquare } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatViews } from "@/lib/format-views";
import { requireNewsroomUser, canPublish } from "@/lib/auth/roles";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { deleteArticleForm, setArticleStatusForm } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { ArticleStatus } from "@/lib/supabase/types";

export const metadata = { title: "Articles" };

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "in_review", label: "In review" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const user = await requireNewsroomUser("/admin/articles");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  let query = supabase
    .from("articles")
    .select(
      "id, title, slug, status, published_at, scheduled_for, updated_at, notified_at, view_count, category:categories(slug, name), author:authors(name)"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (status !== "all") query = query.eq("status", status as ArticleStatus);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: articles, error } = await query;
  const mayPublish = canPublish(user.profile.role);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Articles</h1>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          <PenSquare className="h-4 w-4" /> New article
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/articles${f.value === "all" ? "" : `?status=${f.value}`}`}
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

        <form className="ml-auto" role="search">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Search headlines
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search headlines…"
            className="w-56 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
          />
        </form>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          Couldn&apos;t load articles: {error.message}
        </p>
      )}

      {articles && articles.length > 0 ? (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {articles.map((a) => {
            const category = a.category as unknown as { slug: string; name: string } | null;
            const author = a.author as unknown as { name: string } | null;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {[category?.name, author?.name].filter(Boolean).join(" · ") || "Unfiled"}
                    {a.notified_at ? " · announced" : ""}
                  </p>
                </div>

                <StatusBadge status={a.status} scheduledFor={a.scheduled_for} />

                <span className="hidden w-20 shrink-0 text-right text-xs text-muted sm:block">
                  {a.status === "published" ? `${formatViews(a.view_count ?? 0)} views` : "—"}
                </span>

                <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
                  {new Date(a.updated_at).toLocaleDateString()}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  {a.status === "published" && category && (
                    <Link
                      href={`/article/${category.slug}/${a.slug}`}
                      target="_blank"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                    >
                      View
                    </Link>
                  )}

                  {mayPublish && a.status !== "published" && (
                    <form action={setArticleStatusForm}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value="published" />
                      <button className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand">
                        Publish
                      </button>
                    </form>
                  )}

                  {mayPublish && a.status === "published" && (
                    <form action={setArticleStatusForm}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand">
                        Unpublish
                      </button>
                    </form>
                  )}

                  <form action={deleteArticleForm}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmSubmit
                      message={`Permanently delete "${a.title}"? This cannot be undone.`}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-serif text-lg font-bold">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted">
            {q ? `No headlines match "${q}".` : "Write your first article to get started."}
          </p>
        </div>
      )}
    </div>
  );
}
