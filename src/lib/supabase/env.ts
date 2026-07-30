/**
 * Environment detection for the Supabase backend.
 *
 * The site is designed to run in two modes:
 *
 *   1. **Configured** — Supabase env vars are present. All content, auth, and
 *      subscriber data comes from Postgres.
 *   2. **Preview** — no env vars. The site falls back to the built-in
 *      placeholder archive in `lib/content/data.ts` so `npm run dev` and
 *      `npm run build` work on a fresh clone, and so the public site keeps
 *      rendering if credentials are ever missing in a deploy.
 *
 * Nothing in the app should read `process.env` for Supabase directly; go
 * through these helpers so the fallback stays consistent.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True when the public (anon) Supabase credentials are available. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when the privileged service-role key is available (server only). */
export const hasServiceRole = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

export function serviceRoleKey(): string {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This operation requires the service-role key."
    );
  }
  return SERVICE_ROLE_KEY;
}

/** Hostname of the Supabase project, for next/image remotePatterns. */
export function supabaseHostname(): string | null {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return null;
  }
}
