import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser } from "@/lib/auth/roles";
import { CollectionForm } from "@/components/admin/collection-form";
import { CollectionTabs } from "@/components/admin/collection-tabs";
import { COLLECTIONS, formatDialogue, isCollectionType } from "../../schema";
import type { ConversationTurn } from "@/lib/supabase/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!isCollectionType(type)) return { title: "Collections" };
  const def = COLLECTIONS[type];
  return { title: id === "new" ? `New ${def.singular}` : `Edit ${def.singular}` };
}

/**
 * The editor for one item in any collection.
 *
 * `new` is a reserved id rather than a separate route: creating and editing
 * differ only in whether the form starts empty, and splitting them would mean
 * two pages that have to be kept in step.
 */
export default async function CollectionItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { type, id } = await params;
  const { saved } = await searchParams;
  if (!isCollectionType(type)) notFound();

  const def = COLLECTIONS[type];
  await requireNewsroomUser(`/admin/collections/${type}/${id}`);

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  // The form takes slugs for author and category; the columns hold ids. Join
  // them here so the select can preselect the right option.
  const relations = [
    def.fields.some((f) => f.kind === "author") ? "author:authors(slug)" : "",
    def.fields.some((f) => f.kind === "category") ? "category:categories(slug)" : "",
  ]
    .filter(Boolean)
    .join(", ");

  const [row, { data: authors }, { data: categories }] = await Promise.all([
    id === "new" ? Promise.resolve(null) : loadItem(supabase, def.table, id, relations),
    supabase.from("authors").select("slug, name").eq("is_active", true).order("name"),
    supabase.from("categories").select("slug, name").order("sort_order"),
  ]);

  if (id !== "new" && !row) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <CollectionTabs active={type} />

      {saved && (
        <p className="mt-6 rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          Saved. This {def.singular} now has its own URL.
        </p>
      )}

      <div className="mt-6">
        <CollectionForm
          def={def}
          item={row ? toFormValues(row) : {}}
          authors={authors ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  );
}

type Supa = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

async function loadItem(
  supabase: Supa,
  table: (typeof COLLECTIONS)[keyof typeof COLLECTIONS]["table"],
  id: string,
  relations: string
) {
  const { data } = await supabase
    .from(table)
    .select(relations ? `*, ${relations}` : "*")
    .eq("id", id)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

/**
 * Row shape → form shape.
 *
 * Two columns don't map one-to-one: the id foreign keys become slugs for the
 * selects, and the JSONB transcript becomes the plain "Speaker: text" the
 * textarea shows.
 */
function toFormValues(row: Record<string, unknown>): Record<string, unknown> {
  const values = { ...row };

  const author = row.author as { slug: string } | null | undefined;
  if (author) values.author_id = author.slug;

  const category = row.category as { slug: string } | null | undefined;
  if (category) values.category_id = category.slug;

  if (Array.isArray(row.body)) {
    values.body = formatDialogue(row.body as ConversationTurn[]);
  }

  return values;
}
