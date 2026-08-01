import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireNewsroomUser, isStaff } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapAuthor } from "@/lib/content/supabase-source";
import { ProfileForm } from "@/components/admin/profile-form";
import type { AuthorRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Edit Profile" };
export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ author?: string }>;
}) {
  const user = await requireNewsroomUser("/admin/profile");
  const { author: requestedId } = await searchParams;

  const supabase = await createServerSupabase();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl font-bold">Supabase isn&apos;t connected</h1>
        <p className="mt-2 text-sm text-muted">
          Add your Supabase environment variables and reload. See docs/SETUP.md.
        </p>
      </div>
    );
  }

  // Staff may edit anyone; everyone else is pinned to their own byline.
  const targetId = isStaff(user.profile.role)
    ? requestedId ?? user.profile.author_id
    : user.profile.author_id;

  if (!targetId) {
    const { data: roster } = await supabase
      .from("authors")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl font-bold">No byline linked</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Your account isn&apos;t linked to an author profile, so there&apos;s
          nothing to edit yet. An administrator can link one from the Team page.
        </p>
        {isStaff(user.profile.role) && roster && roster.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Or edit someone else&apos;s profile
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {roster.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/profile?author=${a.id}`}
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
                  >
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const { data: row } = await supabase
    .from("authors")
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  if (!row) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl font-bold">Profile not found</h1>
        <p className="mt-2 text-sm text-muted">
          That author profile no longer exists.
        </p>
      </div>
    );
  }

  const author = mapAuthor(row as AuthorRow);
  const editingSomeoneElse = targetId !== user.profile.author_id;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Your Byline</p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold">Edit Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Everything here publishes to{" "}
            <Link
              href={`/author/${author.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              /author/{author.slug} <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>{" "}
            the moment you save.
          </p>
        </div>
        {editingSomeoneElse && (
          <p className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted">
            Editing as staff: {author.name}
          </p>
        )}
      </header>

      <ProfileForm author={author} authorId={targetId} />
    </div>
  );
}
