import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { getCurrentAccount } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { activeStoreDriver } from "@/lib/store/driver";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STORAGE_LABEL: Record<string, string> = {
  "redis-rest": "Persistent storage (KV)",
  file: "Local file storage",
  memory: "In-memory storage (not persistent)",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already blocked unauthenticated requests; this re-check
  // resolves the account and catches one revoked mid-session.
  const account = await getCurrentAccount();
  if (!account) redirect("/admin/login");

  const driver = activeStoreDriver();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-serif text-lg font-bold leading-none">
              Northeastern <span className="text-brand">Journal</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand sm:inline-flex"
            >
              View site <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none">{account.name}</p>
              <p className="mt-1 text-xs capitalize text-muted">{account.role}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-8 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <AdminNav isOwner={account.role === "owner"} />
          <p className="mt-6 hidden text-[11px] leading-relaxed text-muted lg:block">
            {STORAGE_LABEL[driver] ?? driver}
            {driver === "memory" && (
              <>
                {" "}
                — edits will be lost on restart. Configure{" "}
                <code>KV_REST_API_URL</code> to persist them.
              </>
            )}
          </p>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
