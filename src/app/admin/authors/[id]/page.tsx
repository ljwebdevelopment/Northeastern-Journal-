import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapAuthor } from "@/lib/content/supabase-source";
import { AuthorForm } from "@/components/admin/author-form";
import type { AuthorRow } from "@/lib/supabase/types";
import type { Author } from "@/lib/content/types";

export const metadata: Metadata = { title: "Edit Author" };
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  await requireStaff(`/admin/authors/${id}`);
  if (!UUID_PATTERN.test(id)) notFound();

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const [{ data: row }, { data: categories }] = await Promise.all([
    supabase.from("authors").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("slug, name").order("sort_order").order("name"),
  ]);
  if (!row) notFound();

  const authorRow = row as AuthorRow;
  const author = mapAuthor(authorRow);
  // mapAuthor fills an empty full bio from the short one for display; the
  // form should show what is actually stored.
  author.longBio = authorRow.long_bio;
  // Older rows may keep the X link under the legacy `twitter` key.
  const social = author.social as Record<string, string | undefined>;
  if (!social.x && social.twitter) author.social = { ...social, x: social.twitter } as Author["social"];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <Link
          href="/admin/authors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All authors
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-bold">Edit Author: {author.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Changes publish to{" "}
          <Link
            href={`/author/${author.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            /author/{author.slug} <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>{" "}
          the moment you save.
          {!authorRow.is_active && " This profile is currently hidden from the public site."}
        </p>
      </header>

      {created && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Author created. The profile is live.</p>
            <p className="mt-1 text-sm text-muted">
              <Link href={`/author/${author.slug}`} target="_blank" className="text-brand hover:underline">
                View the public profile
              </Link>
            </p>
          </div>
        </div>
      )}

      <AuthorForm
        author={author}
        authorId={authorRow.id}
        photoUrl={authorRow.photo_url ?? ""}
        categories={categories ?? []}
      />
    </div>
  );
}
