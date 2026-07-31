import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { canEditAuthor } from "@/lib/auth/accounts";
import { getCurrentAccount } from "@/lib/auth/session";
import { getAuthors, getCategories } from "@/lib/content/api";
import { ProfileForm } from "@/components/admin/profile-form";

export const metadata: Metadata = { title: "Edit Profile" };

// Always render against the freshly saved profile.
export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ author?: string }>;
}) {
  const account = await getCurrentAccount();
  const { author: requested } = await searchParams;

  const [authors, categories] = await Promise.all([getAuthors(), getCategories()]);
  const slug = requested ?? account?.authorSlug;
  const author = authors.find((a) => a.slug === slug);

  if (!account) return null;

  if (!author) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl font-bold">No profile linked</h1>
        <p className="mt-2 text-sm text-muted">
          Your account isn&rsquo;t linked to an author profile yet. Add an{" "}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">authorSlug</code>{" "}
          to your entry in <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">NJ_ADMIN_ACCOUNTS</code>{" "}
          that matches one of: {authors.map((a) => a.slug).join(", ")}.
        </p>
      </div>
    );
  }

  if (!canEditAuthor(account, author.slug)) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl font-bold">Not your profile</h1>
        <p className="mt-2 text-sm text-muted">
          You can only edit your own profile. Ask an owner if you need access to
          another contributor&rsquo;s page.
        </p>
        <Link href="/admin/profile" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Edit my profile instead
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Author Experience</p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold">Edit Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Everything here is published to{" "}
            <Link
              href={`/author/${author.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              /author/{author.slug} <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>{" "}
            the moment you save. No code changes, no redeploy.
          </p>
        </div>
        {account.role === "owner" && requested && (
          <p className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted">
            Editing as owner: {author.name}
          </p>
        )}
      </header>

      <ProfileForm author={author} categories={categories} />
    </div>
  );
}
