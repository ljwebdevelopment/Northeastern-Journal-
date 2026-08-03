"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import type { EmailFrequency } from "@/lib/supabase/types";

export interface PreferencesState {
  ok: boolean;
  message: string;
}

const FREQUENCIES: EmailFrequency[] = ["immediate", "daily", "weekly"];

/**
 * Saves a reader's email preferences.
 *
 * Authenticated by the token in the link, exactly as one-click unsubscribe is:
 * requiring someone to create an account before they can turn the volume down
 * is what makes people mark mail as spam instead.
 *
 * The token is never echoed back into the page's HTML beyond the hidden field
 * it arrived in, and the row it identifies is only ever reached through
 * `save_subscriber_preferences`, which can touch nothing else.
 */
export async function savePreferences(
  _prev: PreferencesState,
  formData: FormData
): Promise<PreferencesState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { ok: false, message: "This link is missing its key." };

  if (!hasServiceRole) {
    return { ok: false, message: "Preferences aren't available right now." };
  }

  const frequency = String(formData.get("frequency") ?? "");
  if (!FREQUENCIES.includes(frequency as EmailFrequency)) {
    return { ok: false, message: "Pick how often you'd like to hear from us." };
  }

  const categories = formData.getAll("categories").map(String).filter(Boolean);
  const authors = formData.getAll("authors").map(String).filter(Boolean);

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc("save_subscriber_preferences", {
    token,
    new_frequency: frequency as EmailFrequency,
    category_slugs: categories,
    author_slugs: authors,
  });

  if (error) {
    console.error("[preferences] save failed:", error.message);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  if (data === false) {
    return { ok: false, message: "This link has expired. Use the one in a recent email." };
  }

  revalidatePath("/newsletter/preferences");
  return { ok: true, message: "Saved. Your next email will follow these settings." };
}
