import type { Metadata } from "next";
import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { getAuthors, getCategories } from "@/lib/content/api";
import { unsubscribeUrlFor } from "@/lib/email/send";
import { PreferencesForm } from "@/components/shared/preferences-form";

/**
 * Email preferences, opened from a link in any newsletter.
 *
 * Never cached and never indexed: the URL carries a per-reader token, and a
 * cached or crawled copy of this page would be one reader's settings served to
 * someone else.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const valid = token && /^[0-9a-f-]{36}$/i.test(token) && hasServiceRole;
  const preferences = valid ? await loadPreferences(token) : null;

  if (!preferences) {
    return (
      <div className="content-container py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-serif text-3xl font-bold">Email preferences</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            This page needs the personal link from one of our emails — open any
            newsletter and choose &ldquo;Email preferences&rdquo; at the bottom.
            {token && " The link you used has expired or was already unsubscribed."}
          </p>
          <Link
            href="/newsletter"
            className="mt-6 inline-block rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
          >
            About the newsletter
          </Link>
        </div>
      </div>
    );
  }

  const [categories, authors] = await Promise.all([getCategories(), getAuthors()]);

  return (
    <div className="content-container py-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="kicker">Newsletter</p>
        <h1 className="mt-2 font-serif text-4xl font-bold">Email preferences</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Decide what arrives, and how often. Changes take effect on the next
          email we send.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-2xl">
        <PreferencesForm
          token={token!}
          email={preferences.email}
          frequency={preferences.frequency}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          authors={authors.map((a) => ({ slug: a.slug, name: a.name }))}
          selectedCategories={preferences.category_slugs ?? []}
          selectedAuthors={preferences.author_slugs ?? []}
          unsubscribeUrl={unsubscribeUrlFor(token!)}
        />
      </div>
    </div>
  );
}

async function loadPreferences(token: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc("subscriber_preferences", { token });
  if (error || !data || data.length === 0) return null;

  const row = data[0];
  // An unsubscribed reader gets the "expired link" page rather than a form
  // that would quietly imply they're still on the list.
  return row.status === "confirmed" ? row : null;
}
