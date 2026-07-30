import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ProfileRow, UserRole } from "@/lib/supabase/types";

/**
 * Role model
 * ----------
 *   admin       — everything, including managing the team and settings
 *   editor      — full editorial control: write, edit anyone's work, publish
 *   contributor — write and edit their own drafts; cannot publish
 *   reader      — signed in, but no newsroom access
 *
 * The two founding accounts are seeded as `admin` in
 * `supabase/migrations/0001_initial_schema.sql`. Everyone else defaults to
 * `reader` until an admin invites them from /admin/team.
 *
 * These helpers are convenience only — the real enforcement is Row Level
 * Security in Postgres, so a bug here cannot leak or corrupt data.
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  editor: "Editor",
  contributor: "Contributor",
  reader: "Reader",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full access, including team management, settings, and the newsletter.",
  editor: "Write and edit any article, publish, schedule, and send announcements.",
  contributor: "Write and edit their own drafts. An editor publishes them.",
  reader: "Signed in, but no access to the newsroom.",
};

export interface SessionUser {
  id: string;
  email: string;
  profile: ProfileRow;
}

export const isStaff = (role: UserRole) => role === "admin" || role === "editor";
export const canWrite = (role: UserRole) => isStaff(role) || role === "contributor";
export const canPublish = (role: UserRole) => isStaff(role);
export const canManageTeam = (role: UserRole) => role === "admin";

/** The signed-in user and their profile, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { id: user.id, email: user.email ?? profile.email, profile };
}

/**
 * Gate for every /admin route. Sends signed-out visitors to the login page
 * and signed-in readers to the "no access" page.
 */
export async function requireNewsroomUser(
  returnTo = "/admin"
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!canWrite(user.profile.role)) redirect("/login/no-access");
  return user;
}

/** Gate for admin-only routes (team, settings, subscribers). */
export async function requireAdmin(returnTo = "/admin"): Promise<SessionUser> {
  const user = await requireNewsroomUser(returnTo);
  if (user.profile.role !== "admin") redirect("/admin?error=admin-only");
  return user;
}
