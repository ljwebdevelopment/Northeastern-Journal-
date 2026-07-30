import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
  serviceRoleKey,
} from "./env";
import type { Database } from "./types";

/**
 * Request-scoped Supabase client that reads and refreshes the auth cookie.
 * Use this anywhere the *signed-in user's* permissions should apply — which is
 * everywhere in /admin. RLS does the enforcement.
 *
 * Returns `null` when Supabase is not configured.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session instead, so this is safe.
        }
      },
    },
  });
}

/** Cache tag for everything the public site reads. */
export const CONTENT_CACHE_TAG = "nj-content";

/**
 * Anonymous, cookie-less client for public pages. It never varies by user, so
 * its reads are cached by the Next.js data cache and tagged with
 * `CONTENT_CACHE_TAG` — publishing an article calls `revalidateTag` and the
 * whole public site picks up the change immediately instead of waiting out a
 * timer.
 *
 * Only sees what the anon RLS policies allow: published articles.
 */
export function createPublicSupabase(revalidateSeconds = 300) {
  if (!isSupabaseConfigured) return null;

  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate: revalidateSeconds, tags: [CONTENT_CACHE_TAG] },
        } as RequestInit),
    },
  });
}

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Only for server code that must act without a user: the newsletter
 * double-opt-in routes (an anonymous visitor cannot be allowed to read the
 * subscriber table) and the scheduled-publish cron. Never import this into a
 * client component, and never expose its results directly to the browser.
 */
export function createAdminSupabase() {
  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
