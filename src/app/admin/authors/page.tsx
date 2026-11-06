import type { Metadata } from "next";
import Link from "next/link";
import NextImage from "next/image";
import { ExternalLink, UserPlus, UserRound } from "lucide-react";
import { requireStaff } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Authors" };
export const dynamic = "force-dynamic";

type AuthorListRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  photo_url: string | null;
  username: string | null;
  is_active: boolean;
};

/**
 * Every byline in `public.authors`, with how many articles each is on — as
 * lead author or co-author, in any status. Editors and admins only: checked
 * here on the server, not just by hiding the sidebar link.
 */
export default async function AuthorsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff("/admin/authors");
  const { q = "" } = await searchParams;

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const [authorsResult, leadResult, coResult] = await Promise.all([
    supabase
      .from("authors")
      .select("id, slug, name, role, photo_url, username, is_active")
      .order("name"),
    supabase.from("articles").select("id, author_id").not("author_id", "is", null),
    supabase.from("article_coauthors").select("article_id, author_id"),
  ]);

  // Distinct articles per author, so a piece is never counted twice for
  // someone listed as both lead and co-author.
  const articlesByAuthor = new Map<string, Set<string>>();
  const add = (authorId: string | null, articleId: string) => {
    if (!authorId) return;
    const set = articlesByAuthor.get(authorId) ?? new Set<string>();
    set.add(articleId);
    articlesByAuthor.set(authorId, set);
  };
  for (const a of leadResult.data ?? []) add(a.author_id, a.id);
  for (const c of coResult.data ?? []) add(c.author_id, c.article_id);

  const all = (authorsResult.data ?? []) as AuthorListRow[];
  const needle = q.trim().toLowerCase();
  const authors = needle
    ? all.filter((a) =>
        [a.name, a.slug, a.role, a.username ?? ""].some((v) => v.toLowerCase().includes(needle))
      )
    : all;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Authors</h1>
          <p className="mt-2 text-sm text-muted">
            Every byline on the site. Each one has a public profile at /author/&lt;slug&gt;.
          </p>
        </div>
        <Link
          href="/admin/authors/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          <UserPlus className="h-4 w-4" aria-hidden /> Add author
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {needle
            ? `${authors.length} of ${all.length} authors`
            : `${all.length} author${all.length === 1 ? "" : "s"}`}
        </p>
        <form className="ml-auto flex items-center gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Search authors
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search authors…"
            className="w-56 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
          />
          {needle && (
            <Link href="/admin/authors" className="text-xs font-semibold text-muted hover:text-brand">
              Clear
            </Link>
          )}
        </form>
      </div>

      {authorsResult.error && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          Couldn&apos;t load authors: {authorsResult.error.message}
        </p>
      )}

      {authors.length > 0 ? (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {authors.map((a) => {
            const count = articlesByAuthor.get(a.id)?.size ?? 0;
            return (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                  {a.photo_url ? (
                    // Unoptimized, as in the profile editor: avatars are tiny
                    // and may live on the Storage host or under /public.
                    <NextImage src={a.photo_url} alt="" fill sizes="48px" className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <UserRound className="h-5 w-5 text-muted" aria-hidden />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/authors/${a.id}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {a.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {a.role} · /author/{a.slug}
                    {a.username ? ` · @${a.username}` : ""}
                    {!a.is_active ? " · hidden from the site" : ""}
                  </p>
                </div>

                <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
                  {count} article{count === 1 ? "" : "s"}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/author/${a.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                  >
                    View <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                  <Link
                    href={`/admin/authors/${a.id}`}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !authorsResult.error && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <p className="font-serif text-xl font-bold">
              {needle ? "No authors match that search" : "No authors yet"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {needle ? (
                <Link href="/admin/authors" className="text-brand hover:underline">
                  Show everyone
                </Link>
              ) : (
                "Add the first byline to get started."
              )}
            </p>
          </div>
        )
      )}
    </div>
  );
}
