import type { Metadata } from "next";
import Link from "next/link";
import { accountsConfigured, usingDevAccount } from "@/lib/auth/accounts";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/admin" } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  const [hasAccounts, isDevAccount] = await Promise.all([
    accountsConfigured(),
    usingDevAccount(),
  ]);

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="kicker">Northeastern Journal</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to edit your author profile and manage subscribers.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 card-shadow">
          {hasAccounts ? (
            <LoginForm next={safeNext} />
          ) : (
            <p className="text-sm text-muted">
              No dashboard accounts are configured yet. Set the{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">
                NJ_ADMIN_ACCOUNTS
              </code>{" "}
              environment variable, then reload this page. See the README for
              the format and the password-hashing command.
            </p>
          )}

          {isDevAccount && (
            <p className="mt-5 rounded-lg border border-dashed border-border bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-muted">
              <strong className="text-foreground">Development account:</strong>{" "}
              editor@northeasternjournal.com / northeastern. This account only
              exists when <code>NJ_ADMIN_ACCOUNTS</code> is unset and never in
              production builds.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-muted hover:text-brand">
            ← Back to the Journal
          </Link>
        </p>
      </div>
    </div>
  );
}
