"use server";

/**
 * Profile editing from the dashboard. Saves go straight to the profile
 * store and the affected public routes are revalidated in the same
 * request, so a change is live the moment the editor clicks Save.
 */
import { revalidatePath } from "next/cache";
import { getCategories } from "@/lib/content/api";
import type { CategorySlug } from "@/lib/content/types";
import { canEditAuthor } from "@/lib/auth/accounts";
import { getCurrentAccount } from "@/lib/auth/session";
import { saveAuthorProfile } from "@/lib/store/authors";
import { parseProfileForm } from "./profile-schema";
import type { ProfileFormState } from "./profile-form-state";

function revalidateAuthor(slug: string) {
  revalidatePath(`/author/${slug}`);
  revalidatePath("/authors");
  revalidatePath("/");
  if (slug === "cherokee-nana") revalidatePath("/cherokee-nana");
}

export async function saveProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const account = await getCurrentAccount();
  if (!account) {
    return {
      status: "error",
      message: "Your session expired. Sign in again to save changes.",
      errors: {},
    };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!slug || !canEditAuthor(account, slug)) {
    return {
      status: "error",
      message: "You don't have permission to edit this profile.",
      errors: {},
    };
  }

  const categories = await getCategories();
  const parsed = parseProfileForm(
    formData,
    categories.map((c) => c.slug as CategorySlug)
  );

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and save again.",
      errors: parsed.errors,
    };
  }

  try {
    await saveAuthorProfile(slug, parsed.values);
  } catch (error) {
    console.error("[profile] save failed", error);
    return {
      status: "error",
      message: "We couldn't save your profile. Please try again.",
      errors: {},
    };
  }

  revalidateAuthor(slug);

  return {
    status: "saved",
    message: "Profile saved. Your public page is already updated.",
    errors: {},
    savedAt: new Date().toISOString(),
  };
}
