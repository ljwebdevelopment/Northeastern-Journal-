import type { Metadata } from "next";
import Link from "next/link";
import { requireNewsroomUser, ROLE_LABELS } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AdminNav } from "@/components/admin/admin-nav";
import { SetupNotice } from "@/components/admin/setup-notice";

export const metadata: Metadata = {
  title: { default: "Newsroom", template: "%s · Newsroom" },
  robots: { index: false, follow: false },
};

/**
 * The dashboard runs on live data only — never cache it, or an editor will
 * save a change and be shown the previous version.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await requireNewsroomUser();
  const role = user.profile.role;

  return (
    <div className="min-h-screen bg-surface-muted/40">
      <div className="mx-auto flex max-w-[100rem] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col p-4 lg:p-5">
            <Link href="/" className="block">
              <span className="font-serif text-lg font-bold">
                Northeastern <span className="text-brand">Journal</span>
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Newsroom
              </span>
            </Link>

            <AdminNav role={role} />

            <div className="mt-6 border-t border-border pt-4 lg:mt-auto">
              <p className="truncate text-sm font-semibold">
                {user.profile.full_name || user.email}
              </p>
              <p className="text-xs text-muted">{ROLE_LABELS[role]}</p>
              <form action="/auth/signout" method="post" className="mt-3">
                <button
                  type="submit"
                  className="text-xs font-semibold text-muted transition-colors hover:text-brand"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
