import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/auth/session";
import { listAccounts } from "@/lib/auth/accounts";
import { getAuthors } from "@/lib/content/api";
import { activeStoreDriver } from "@/lib/store/driver";
import {
  ChangeEmailForm,
  ChangePasswordForm,
  CreateAccountForm,
  ManageAccountsList,
  MyDetailsForm,
} from "@/components/admin/account-forms";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await getCurrentAccount();
  if (!account) return null;

  const isOwner = account.role === "owner";
  const [accounts, authors] = await Promise.all([
    isOwner ? listAccounts() : Promise.resolve([]),
    getAuthors(),
  ]);
  const driver = activeStoreDriver();

  return (
    <div>
      <header className="mb-6">
        <p className="kicker">Your Account</p>
        <h1 className="mt-1.5 font-serif text-3xl font-bold">Account</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Your sign-in details.{" "}
          {isOwner
            ? "As an owner you can also add editors and reset their passwords."
            : "To change your role or linked profile, ask an owner."}
        </p>
      </header>

      {driver === "memory" && (
        <p className="mb-6 rounded-xl border border-border bg-surface-muted px-5 py-4 text-sm text-muted">
          <strong className="text-foreground">Heads up:</strong> this site is
          using in-memory storage, so account changes are lost when the server
          restarts. Configure <code>KV_REST_API_URL</code> to make them stick.
        </p>
      )}

      <div className="space-y-6">
        <MyDetailsForm account={account} />
        <ChangePasswordForm />
        <ChangeEmailForm account={account} />

        {isOwner && (
          <>
            <CreateAccountForm authors={authors} />
            <ManageAccountsList
              accounts={accounts}
              authors={authors}
              currentEmail={account.email}
            />
          </>
        )}
      </div>
    </div>
  );
}
