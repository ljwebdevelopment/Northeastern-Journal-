"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { isStaff, requireNewsroomUser } from "@/lib/auth/roles";
import { parseProfileFields, text } from "./fields";
import type { ProfileFormState } from "./state";

/**
 * Saves an author profile.
 *
 * The write goes through the signed-in user's own Supabase client, not the
 * service role, so Row Level Security decides what they may touch: the
 * "authors edit own byline" policy allows their linked row, and
 * "authors staff write" allows editors and admins to edit anyone. A
 * contributor who tampers with the hidden author id gets a policy failure
 * from Postgres rather than a successful write.
 */

export async function saveProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireNewsroomUser("/admin/profile");
  const supabase = await createServerSupabase();
  if (!supabase) {
    return { status: "error", message: "Supabase isn't configured.", errors: {} };
  }

  const authorId = text(formData, "authorId");
  if (!authorId) {
    return { status: "error", message: "No author profile is linked to your account.", errors: {} };
  }
  // Belt and braces — RLS is the real check, this just gives a better message.
  if (!isStaff(user.profile.role) && user.profile.author_id !== authorId) {
    return { status: "error", message: "You can only edit your own profile.", errors: {} };
  }

  const { values, errors } = parseProfileFields(formData);

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", errors };
  }

  const { data: updated, error } = await supabase
    .from("authors")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authorId)
    .select("slug")
    .maybeSingle();

  if (error) {
    // 23505 is a unique-violation; the only unique column here is the handle.
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        errors: { username: "That username is already taken." },
      };
    }
    console.error("[profile] save failed", error.message);
    return { status: "error", message: "We couldn't save your profile.", errors: {} };
  }

  // No row came back: RLS refused the update.
  if (!updated) {
    return {
      status: "error",
      message: "You don't have permission to edit this profile.",
      errors: {},
    };
  }

  revalidatePath(`/author/${updated.slug}`);
  revalidatePath("/admin/profile");
  revalidatePath("/");

  return {
    status: "saved",
    message: "Profile saved. Your public page is already updated.",
    errors: {},
  };
}
