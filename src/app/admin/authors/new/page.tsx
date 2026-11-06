import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase/server";
import { AuthorForm } from "@/components/admin/author-form";

export const metadata: Metadata = { title: "Add Author" };
export const dynamic = "force-dynamic";

export default async function NewAuthorPage() {
  await requireStaff("/admin/authors/new");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name")
    .order("sort_order")
    .order("name");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <Link
          href="/admin/authors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All authors
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-bold">Add Author</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Creates a byline and its public profile page. Once saved, the author can be
          picked on any article.
        </p>
      </header>

      <AuthorForm categories={categories ?? []} />
    </div>
  );
}
