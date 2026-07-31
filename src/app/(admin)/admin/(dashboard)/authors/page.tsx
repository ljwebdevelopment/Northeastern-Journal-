import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, PencilLine } from "lucide-react";
import { getCurrentAccount } from "@/lib/auth/session";
import { getArticles, getAuthors } from "@/lib/content/api";
import { AuthorPhoto } from "@/components/shared/author-photo";

export const metadata: Metadata = { title: "Authors" };
export const dynamic = "force-dynamic";

/** Owner-only roster: edit any contributor's profile. */
export default async function AdminAuthorsPage() {
  const account = await getCurrentAccount();
  if (!account) return null;
  if (account.role !== "owner") redirect("/admin/profile");

  const [authors, articles] = await Promise.all([getAuthors(), getArticles()]);

  return (
    <div>
      <header className="mb-6">
        <p className="kicker">Team</p>
        <h1 className="mt-1.5 font-serif text-3xl font-bold">Authors</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every contributor on the masthead. As an owner you can edit any
          profile; authors can edit only their own.
        </p>
      </header>

      <ul className="space-y-3">
        {authors.map((author) => {
          const count = articles.filter((a) => a.authorSlug === author.slug).length;
          return (
            <li
              key={author.slug}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                <AuthorPhoto src={author.photo} alt={`Portrait of ${author.name}`} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{author.name}</p>
                <p className="text-xs uppercase tracking-wide text-muted">{author.role}</p>
                <p className="mt-1 text-xs text-muted">
                  {count} {count === 1 ? "article" : "articles"}
                  {author.updatedAt &&
                    ` · profile updated ${new Date(author.updatedAt).toLocaleDateString("en-US")}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/author/${author.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-brand"
                >
                  View <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Link
                  href={`/admin/profile?author=${author.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden /> Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
