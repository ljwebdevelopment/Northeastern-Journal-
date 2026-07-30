"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { inviteTeamMember, type ActionState } from "@/app/admin/actions";
import { ROLE_LABELS_CLIENT } from "./role-labels";
import { cn } from "@/lib/utils";

const initialState: ActionState = { ok: true, message: "" };

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteTeamMember, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-semibold">
            Email address
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="writer@example.com"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm font-semibold">
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="contributor"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {(Object.keys(ROLE_LABELS_CLIENT) as (keyof typeof ROLE_LABELS_CLIENT)[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS_CLIENT[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            state.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-brand/10 text-brand"
          )}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Send invitation
      </button>
    </form>
  );
}
