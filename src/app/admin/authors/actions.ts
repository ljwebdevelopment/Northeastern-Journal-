"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, CONTENT_CACHE_TAG } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { getSessionUser, isStaff } from "@/lib/auth/roles";
import { slugify } from "@/lib/richtext";
import { parseProfileFields, SOCIAL_KEYS, text } from "@/app/admin/profile/fields";
import type { AuthorFormState } from "./state";

/**
 * Creates or updates an author profile from /admin/authors.
 *
 * Editors and admins only. Checked here, on the server, before anything is
 * read from the form — and again by Postgres: the "authors staff write" RLS
 * policy refuses inserts and updates from anyone else, because the write goes
 * through the signed-in user's own Supabase client, never the service role.
 *
 * There is deliberately no delete. Articles, co-author rows and follower lists
 * all point at `authors.id`; removing a byline is a separate decision.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Formats the uploader accepts (components/admin/use-image-upload.ts). */
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif)$/i;

const fail = (message: string, errors: Record<string, string> = {}): AuthorFormState => ({
  status: "error",
  message,
  errors,
});

/**
 * A new photo must be one the dashboard uploaded: a file in this project's
 * public `media` bucket. Storage enforces the 10 MB limit and image types on
 * the way in, so this stops the hidden field being pointed anywhere else.
 * An unchanged photo is always accepted, so existing profiles that use a
 * site-relative path (e.g. /authors/name.jpg) keep it untouched.
 */
function photoError(url: string | null, previous: string | null): string | null {
  if (!url || url === previous) return null;
  const prefix = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/media/`;
  if (!SUPABASE_URL || !url.startsWith(prefix)) {
    return "Use the Upload button to add a photo.";
  }
  if (!PHOTO_EXTENSIONS.test(new URL(url).pathname)) {
    return "Use a JPEG, PNG, WebP, AVIF, or GIF image.";
  }
  return null;
}

/**
 * Exact match on slug or (case-insensitive) username. The query uses `ilike`
 * to reach mixed-case handles, where `_` is a wildcard, so confirm here.
 */
function sameHandle(row: { slug: string; username: string | null }, value: string): boolean {
  return row.slug === value || row.username?.toLowerCase() === value.toLowerCase();
}

export async function saveAuthorAction(
  _prev: AuthorFormState,
  formData: FormData
): Promise<AuthorFormState> {
  const user = await getSessionUser();
  if (!user || !isStaff(user.profile.role)) {
    return fail("Only editors and administrators can manage authors.");
  }

  const supabase = await createServerSupabase();
  if (!supabase) return fail("Supabase isn't configured.");

  // Present on edit, absent on create.
  const authorId = text(formData, "authorId");
  if (authorId && !UUID_PATTERN.test(authorId)) return fail("That author profile doesn't exist.");

  let existing: { slug: string; photo_url: string | null; social: Record<string, string> } | null =
    null;
  if (authorId) {
    const { data } = await supabase
      .from("authors")
      .select("slug, photo_url, social")
      .eq("id", authorId)
      .maybeSingle();
    if (!data) return fail("That author profile no longer exists.");
    existing = data;
  }

  const { values, errors } = parseProfileFields(formData);

  // Only the name is mandatory for the profile itself; parseProfileFields also
  // requires a title and short bio, the same rules Edit Profile applies, so a
  // profile created here can always be re-saved from there. Reword for staff
  // editing someone else.
  if (errors.name) errors.name = "Name is required.";
  if (errors.bio) errors.bio = "A short bio is required — it runs under the byline.";

  // Slug: filled from the name when left blank, always normalised.
  const rawSlug = text(formData, "slug");
  const slug = slugify(rawSlug || values.name);
  if (!slug) {
    errors.slug = "Enter a URL slug — letters, numbers and dashes.";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and single dashes only.";
  }

  const photo = photoError(values.photo_url, existing?.photo_url ?? null);
  if (photo) errors.photo = photo;

  // Topics are category slugs; ignore anything that isn't a real section.
  const requestedTopics = formData.getAll("relatedTopics").map((v) => String(v));
  let relatedTopics: string[] = [];
  if (requestedTopics.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("slug")
      .in("slug", requestedTopics);
    const valid = new Set((categories ?? []).map((c) => c.slug));
    relatedTopics = [...new Set(requestedTopics)].filter((t) => valid.has(t));
  }

  // Uniqueness. A profile answers at /author/<slug> and /author/<username>,
  // with slugs matched first — so a slug must not equal another author's
  // handle (it would take over their URL), and vice versa.
  if (!errors.slug) {
    const { data: clashes } = await supabase
      .from("authors")
      .select("id, slug, username")
      .or(`slug.eq.${slug},username.ilike.${slug}`);
    const other = (clashes ?? []).find((a) => a.id !== authorId && sameHandle(a, slug));
    if (other) {
      errors.slug =
        other.slug === slug
          ? "Another author already uses this URL slug."
          : "Another author's username already uses this URL.";
    }
  }
  if (values.username && !errors.username) {
    const { data: clashes } = await supabase
      .from("authors")
      .select("id, slug, username")
      .or(`slug.eq.${values.username},username.ilike.${values.username}`);
    const other = (clashes ?? []).find(
      (a) => a.id !== authorId && sameHandle(a, values.username as string)
    );
    if (other) {
      errors.username =
        other.slug === values.username
          ? "Another author's URL slug already uses this username."
          : "That username is already taken.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  // Keep social keys this form doesn't show, so nothing stored is lost. The
  // legacy `twitter` key (read as X on profiles, and the edit page pre-fills
  // the X field from it) is kept only while an X link is set, so clearing X
  // really removes the icon.
  const social: Record<string, string> = { ...values.social };
  for (const [key, value] of Object.entries(existing?.social ?? {})) {
    if ((SOCIAL_KEYS as readonly string[]).includes(key)) continue;
    if (key === "twitter" && !social.x) continue;
    social[key] = value;
  }

  const row = {
    ...values,
    social,
    slug,
    related_topics: relatedTopics,
  };

  const result = authorId
    ? await supabase
        .from("authors")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", authorId)
        .select("id, slug")
        .maybeSingle()
    : await supabase.from("authors").insert(row).select("id, slug").maybeSingle();

  if (result.error) {
    // 23505 is a unique violation. The checks above make this a race between
    // two editors saving at once; say which field lost.
    if (result.error.code === "23505") {
      const onUsername = result.error.message.includes("username");
      return fail(
        "Please fix the highlighted fields.",
        onUsername
          ? { username: "That username is already taken." }
          : { slug: "Another author already uses this URL slug." }
      );
    }
    console.error("[authors] save failed", result.error.message);
    return fail("We couldn't save this author.");
  }

  // No row back: RLS refused the write.
  if (!result.data) return fail("You don't have permission to edit authors.");

  // Bylines show on every article card, so refresh the public site's data
  // cache, then the pages that list or show this author.
  updateTag(CONTENT_CACHE_TAG);
  revalidatePath("/authors");
  revalidatePath(`/author/${result.data.slug}`);
  if (existing && existing.slug !== result.data.slug) revalidatePath(`/author/${existing.slug}`);
  revalidatePath("/admin/authors");
  revalidatePath("/admin/profile");

  if (!authorId) redirect(`/admin/authors/${result.data.id}?created=1`);

  revalidatePath(`/admin/authors/${authorId}`);
  return {
    status: "saved",
    message: "Author saved. The public profile is already updated.",
    errors: {},
    slug: result.data.slug,
  };
}
