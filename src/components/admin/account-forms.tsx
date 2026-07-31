"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Trash2, UserPlus } from "lucide-react";
import type { AdminAccount } from "@/lib/auth/accounts";
import type { Author } from "@/lib/content/types";
import {
  changeMyEmailAction,
  changeMyPasswordAction,
  createAccountAction,
  deleteAccountAction,
  resetAccountPasswordAction,
  updateAccountAction,
  updateMyDetailsAction,
} from "@/lib/auth/account-actions";
import { initialAccountFormState, MIN_PASSWORD_LENGTH } from "@/lib/auth/account-state";
import { FieldGroup, TextField, inputClasses } from "./form-fields";
import { cn } from "@/lib/utils";

function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? busy : label}
    </button>
  );
}

function Banner({ state }: { state: { status: string; message: string } }) {
  if (state.status === "saved") {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <p className="text-sm">{state.message}</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg bg-brand/10 px-4 py-3 text-sm font-medium text-brand">
        {state.message}
      </p>
    );
  }
  return null;
}

/* -------------------------------------------------------------------- */

export function MyDetailsForm({ account }: { account: AdminAccount }) {
  const [state, action] = useActionState(updateMyDetailsAction, initialAccountFormState);
  return (
    <FieldGroup title="Your details" description="The name shown in the dashboard header.">
      <form action={action} className="space-y-5">
        <Banner state={state} />
        <TextField
          label="Display name"
          name="name"
          required
          defaultValue={account.name}
          error={state.errors.name}
        />
        <SubmitButton label="Save details" busy="Saving…" />
      </form>
    </FieldGroup>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changeMyPasswordAction, initialAccountFormState);
  return (
    <FieldGroup
      title="Change password"
      description="You'll need your current password. The change takes effect immediately."
    >
      <form action={action} className="space-y-5">
        <Banner state={state} />
        <TextField
          label="Current password"
          name="currentPassword"
          type="password"
          required
          error={state.errors.currentPassword}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="New password"
            name="newPassword"
            type="password"
            required
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            error={state.errors.newPassword}
          />
          <TextField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            required
            error={state.errors.confirmPassword}
          />
        </div>
        <SubmitButton label="Change password" busy="Changing…" />
      </form>
    </FieldGroup>
  );
}

export function ChangeEmailForm({ account }: { account: AdminAccount }) {
  const [state, action] = useActionState(changeMyEmailAction, initialAccountFormState);
  return (
    <FieldGroup
      title="Sign-in email"
      description="The address you use to sign in. Confirm with your password."
    >
      <form action={action} className="space-y-5">
        <Banner state={state} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Email address"
            name="email"
            type="email"
            required
            defaultValue={account.email}
            error={state.errors.email}
          />
          <TextField
            label="Current password"
            name="password"
            type="password"
            required
            error={state.errors.password}
          />
        </div>
        <SubmitButton label="Update email" busy="Updating…" />
      </form>
    </FieldGroup>
  );
}

/* -------------------------------------------------------------------- */
/* Owner-only: manage other editors                                      */
/* -------------------------------------------------------------------- */

function RoleSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Role</span>
      <select name={name} defaultValue={defaultValue ?? "author"} className={cn(inputClasses, "mt-1.5")}>
        <option value="author">Author — edits only their own profile</option>
        <option value="owner">Owner — edits everything and manages accounts</option>
      </select>
    </label>
  );
}

function AuthorSelect({
  name,
  authors,
  defaultValue,
}: {
  name: string;
  authors: Author[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
        Linked author profile
      </span>
      <select name={name} defaultValue={defaultValue ?? ""} className={cn(inputClasses, "mt-1.5")}>
        <option value="">None — no public profile to edit</option>
        {authors.map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CreateAccountForm({ authors }: { authors: Author[] }) {
  const [state, action] = useActionState(createAccountAction, initialAccountFormState);
  const [open, setOpen] = useState(false);

  return (
    <FieldGroup
      title="Add an editor"
      description="Creates a sign-in for someone else. Share the password with them directly — they can change it from this page."
    >
      {open ? (
        <form action={action} className="space-y-5">
          <Banner state={state} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Full name" name="name" required error={state.errors.name} />
            <TextField label="Email address" name="email" type="email" required error={state.errors.email} />
            <TextField
              label="Temporary password"
              name="password"
              type="password"
              required
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              error={state.errors.password}
            />
            <RoleSelect name="role" />
            <AuthorSelect name="authorSlug" authors={authors} />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton label="Create account" busy="Creating…" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-muted hover:text-brand"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
        >
          <UserPlus className="h-4 w-4" aria-hidden /> Add an editor
        </button>
      )}
    </FieldGroup>
  );
}

function ManageAccountRow({
  account,
  authors,
  isSelf,
}: {
  account: AdminAccount;
  authors: Author[];
  isSelf: boolean;
}) {
  const [detailState, detailAction] = useActionState(updateAccountAction, initialAccountFormState);
  const [resetState, resetAction] = useActionState(resetAccountPasswordAction, initialAccountFormState);
  const [deleteState, deleteAction] = useActionState(deleteAccountAction, initialAccountFormState);
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {account.name}
            {isSelf && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
          </p>
          <p className="text-xs text-muted">
            {account.email} · {account.role}
            {account.authorSlug ? ` · ${account.authorSlug}` : " · no profile"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
        >
          {expanded ? "Close" : "Manage"}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <Banner state={detailState} />
          <form action={detailAction} className="space-y-4">
            <input type="hidden" name="email" value={account.email} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" name="name" defaultValue={account.name} />
              <RoleSelect name="role" defaultValue={account.role} />
              <AuthorSelect name="authorSlug" authors={authors} defaultValue={account.authorSlug} />
            </div>
            <SubmitButton label="Save changes" busy="Saving…" />
          </form>

          <div className="border-t border-border pt-5">
            <Banner state={resetState} />
            <form action={resetAction} className="mt-3 space-y-4">
              <input type="hidden" name="email" value={account.email} />
              <TextField
                label="Reset password to"
                name="password"
                type="password"
                hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it with them directly.`}
                error={resetState.errors.password}
              />
              <SubmitButton label="Reset password" busy="Resetting…" />
            </form>
          </div>

          {!isSelf && (
            <div className="border-t border-border pt-5">
              <Banner state={deleteState} />
              <form action={deleteAction} className="mt-3">
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove this editor&rsquo;s access
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function ManageAccountsList({
  accounts,
  authors,
  currentEmail,
}: {
  accounts: AdminAccount[];
  authors: Author[];
  currentEmail: string;
}) {
  return (
    <FieldGroup
      title="Editors"
      description="Everyone who can sign in to this dashboard."
    >
      <ul className="space-y-3">
        {accounts.map((account) => (
          <ManageAccountRow
            key={account.email}
            account={account}
            authors={authors}
            isSelf={account.email === currentEmail}
          />
        ))}
      </ul>
    </FieldGroup>
  );
}
