import type { UserRole } from "@/lib/supabase/types";

/**
 * Client-safe copy of the role labels. `lib/auth/roles.ts` is server-only
 * (it imports `next/navigation` redirects and the Supabase server client),
 * so client components read the labels from here instead.
 */
export const ROLE_LABELS_CLIENT: Record<UserRole, string> = {
  admin: "Administrator",
  editor: "Editor",
  contributor: "Contributor",
  reader: "Reader",
};
