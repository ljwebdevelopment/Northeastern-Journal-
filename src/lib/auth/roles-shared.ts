import type { UserRole } from "@/lib/supabase/types";

/**
 * The role predicates, with no server-only imports.
 *
 * `lib/auth/roles.ts` is marked `server-only` because it reads cookies, which
 * means a client component that only wants to ask "is this person an editor?"
 * cannot import from it. These four functions are pure, so they live here and
 * `roles.ts` re-exports them — one definition, usable from both sides.
 *
 * None of this is enforcement. Row Level Security in Postgres is; these decide
 * what to render.
 */

export const isStaff = (role: UserRole) => role === "admin" || role === "editor";
export const canWrite = (role: UserRole) => isStaff(role) || role === "contributor";
export const canPublish = (role: UserRole) => isStaff(role);
export const canManageTeam = (role: UserRole) => role === "admin";
