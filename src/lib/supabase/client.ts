"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";
import type { Database } from "./types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Supabase client for the browser. Used by the sign-in form and by the
 * admin image uploader. Returns `null` when Supabase is not configured so
 * client components can render a helpful message instead of crashing.
 */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
