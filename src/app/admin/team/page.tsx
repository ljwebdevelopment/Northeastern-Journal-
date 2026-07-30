import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/roles";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { InviteForm } from "@/components/admin/invite-form";
import { revokeTeamMemberForm, updateTeamRoleForm } from "@/app/admin/actions";
import type { UserRole } from "@/lib/supabase/types";

export const metadata = { title: "Team" };

const ROLES: UserRole[] = ["admin", "editor", "contributor", "reader"];

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const admin = await requireAdmin("/admin/team");
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const [{ data: allowlist }, { data: profiles }] = await Promise.all([
    supabase.from("admin_allowlist").select("*").order("invited_at"),
    supabase.from("profiles").select("email, full_name, role, created_at"),
  ]);

  const profileByEmail = new Map(
    (profiles ?? []).map((p) => [p.email.toLowerCase(), p])
  );

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Team</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Invite a writer by email. The next time they sign in they&apos;ll get
          the role you picked — no password to set up, no code to deploy.
        </p>
      </header>

      {notice && (
        <p className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {notice}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-serif text-lg font-bold">Invite someone</h2>
        <InviteForm />
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-bold">Who has access</h2>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {(allowlist ?? []).map((entry) => {
            const profile = profileByEmail.get(entry.email.toLowerCase());
            const isSelf = entry.email.toLowerCase() === admin.email.toLowerCase();
            return (
              <li key={entry.email} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {profile?.full_name || entry.email}
                    {isSelf && <span className="ml-2 text-xs text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {entry.email} ·{" "}
                    {entry.accepted_at
                      ? `joined ${new Date(entry.accepted_at).toLocaleDateString()}`
                      : "invitation pending first sign-in"}
                  </p>
                </div>

                <form action={updateTeamRoleForm} className="flex items-center gap-2">
                  <input type="hidden" name="email" value={entry.email} />
                  <label htmlFor={`role-${entry.email}`} className="sr-only">
                    Role for {entry.email}
                  </label>
                  <select
                    id={`role-${entry.email}`}
                    name="role"
                    defaultValue={entry.role}
                    disabled={isSelf}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isSelf}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand disabled:opacity-40"
                  >
                    Update
                  </button>
                </form>

                <form action={revokeTeamMemberForm}>
                  <input type="hidden" name="email" value={entry.email} />
                  <ConfirmSubmit
                    message={`Revoke newsroom access for ${entry.email}?`}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                  >
                    Revoke
                  </ConfirmSubmit>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-serif text-lg font-bold">What the roles mean</h2>
        <dl className="mt-4 space-y-3">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="text-sm font-semibold">{ROLE_LABELS[r]}</dt>
              <dd className="text-sm text-muted">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Roles are enforced in the database with Row Level Security, not just
          in the interface — a contributor cannot publish even by calling the
          API directly.
        </p>
      </section>
    </div>
  );
}
