"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, CONTENT_CACHE_TAG } from "@/lib/supabase/server";
import { getSessionUser, canWrite } from "@/lib/auth/roles";
import { sanitizeArticleHtml, slugify } from "@/lib/richtext";
import type { ActionState } from "@/app/admin/actions";
import {
  COLLECTIONS,
  isCollectionType,
  parseDialogue,
  youtubeId,
  type CollectionDef,
  type Field,
} from "./schema";

/**
 * Create, update, and delete for every collection.
 *
 * One implementation for all four types: the shape of a row comes from the
 * schema, so adding a field is a line in `schema.ts` rather than a change
 * here. Permission is `can_write` — contributors included — because none of
 * this carries the risks that make publishing an article an editor's job.
 */

const fail = (message: string, errors?: Record<string, string>): ActionState => ({
  ok: false,
  message,
  errors,
});

function refreshPublicSite(def: CollectionDef) {
  updateTag(CONTENT_CACHE_TAG);
  revalidatePath(def.publicPath, "layout");
  revalidatePath(`/admin/collections/${def.type}`);
}

export async function saveCollectionItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !canWrite(user.profile.role)) {
    return fail("You don't have permission to edit this.");
  }

  const type = String(formData.get("type") ?? "");
  if (!isCollectionType(type)) return fail("Unknown collection.");
  const def = COLLECTIONS[type];

  const supabase = await createServerSupabase();
  if (!supabase) return fail("Supabase is not configured.");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return fail("A title is required.", { title: "Give it a title." });

  const payload: Record<string, unknown> = {
    is_published: formData.get("is_published") === "on",
  };

  for (const field of def.fields) {
    const value = await coerce(field, formData, supabase);
    // `undefined` means "this field had nothing to say" — a lookup that found
    // no match, for instance. Leave the column as it was rather than nulling
    // it because a select happened to be empty on this submit.
    if (value !== undefined) payload[field.name] = value;
  }

  const requested = slugify(String(formData.get("slug") ?? "") || title);
  payload.slug = await uniqueSlug(supabase, def.table, requested || "untitled", id || null);

  /*
   * `as never` is the one place this design pays for itself in types.
   *
   * The payload is assembled from the schema at runtime and the table is
   * chosen at runtime too, so TypeScript cannot narrow it to one of the four
   * row types — it sees a union and rejects every key. The check that matters
   * still happens: Postgres rejects a column that doesn't exist, and RLS
   * decides whether the write is allowed at all.
   */
  if (id) {
    const { error } = await supabase.from(def.table).update(payload as never).eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshPublicSite(def);
    return { ok: true, message: payload.is_published ? "Saved and live." : "Saved as a draft." };
  }

  payload.created_by = user.id;
  const { data, error } = await supabase
    .from(def.table)
    .insert(payload as never)
    .select("id")
    .single();

  if (error || !data) return fail(friendly(error?.message ?? "Could not save."));

  refreshPublicSite(def);
  redirect(`/admin/collections/${type}/${data.id}?saved=1`);
}

export async function deleteCollectionItemForm(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canWrite(user.profile.role)) return;

  const type = String(formData.get("type") ?? "");
  if (!isCollectionType(type)) return;
  const def = COLLECTIONS[type];

  const supabase = await createServerSupabase();
  if (!supabase) return;

  await supabase.from(def.table).delete().eq("id", String(formData.get("id")));

  refreshPublicSite(def);
  redirect(`/admin/collections/${type}?deleted=1`);
}

/** Publish toggle from the list, so a piece can be pulled without opening it. */
export async function toggleCollectionPublishedForm(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canWrite(user.profile.role)) return;

  const type = String(formData.get("type") ?? "");
  if (!isCollectionType(type)) return;
  const def = COLLECTIONS[type];

  const supabase = await createServerSupabase();
  if (!supabase) return;

  await supabase
    .from(def.table)
    .update({ is_published: formData.get("published") === "true" })
    .eq("id", String(formData.get("id")));

  refreshPublicSite(def);
}

// ---------------------------------------------------------------------------
// Field coercion
// ---------------------------------------------------------------------------

type Supa = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

/**
 * Turns one form value into what its column expects.
 *
 * Empty strings become null rather than '': a book with no buy link should
 * have no buy link, not an empty one that renders as a dead button.
 */
async function coerce(
  field: Field,
  formData: FormData,
  supabase: Supa
): Promise<unknown | undefined> {
  const raw = String(formData.get(field.name) ?? "").trim();

  switch (field.kind) {
    case "number":
      return raw ? Number(raw) || 0 : 0;

    case "date":
      // `datetime-local` has no timezone; the browser sends the absolute
      // instant alongside it, exactly as the article scheduler does.
      return String(formData.get(`${field.name}_iso`) ?? "") || raw || new Date().toISOString();

    case "html":
      return sanitizeArticleHtml(raw);

    case "dialogue":
      return parseDialogue(raw);

    case "slugs":
      return raw
        .split(",")
        .map((s) => slugify(s.trim()))
        .filter(Boolean);

    case "author":
    case "category": {
      if (!raw) return null;
      const table = field.kind === "author" ? "authors" : "categories";
      const { data } = await supabase.from(table).select("id").eq("slug", raw).maybeSingle();
      return data?.id ?? null;
    }

    case "text":
      return field.name === "youtube_id" ? youtubeId(raw) : raw;

    case "url":
    case "image":
      return raw || null;

    default:
      return raw;
  }
}

async function uniqueSlug(
  supabase: Supa,
  table: CollectionDef["table"],
  base: string,
  currentId: string | null
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase
      .from(table)
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === currentId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function friendly(message: string): string {
  if (message.includes("does not exist") || message.includes("schema cache")) {
    return "These tables don't exist yet — run supabase/migrations/0012_collections.sql.";
  }
  if (message.includes("duplicate key") && message.includes("slug")) {
    return "Something already uses that URL slug.";
  }
  if (message.includes("row-level security")) {
    return "You don't have permission to make that change.";
  }
  return message;
}
