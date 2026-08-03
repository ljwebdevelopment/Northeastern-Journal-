import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser } from "@/lib/auth/roles";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { CollectionTabs } from "@/components/admin/collection-tabs";
import {
  deleteCollectionItemForm,
  toggleCollectionPublishedForm,
} from "@/app/admin/collections/actions";
import { COLLECTIONS, COLLECTION_TYPES, isCollectionType } from "../schema";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return COLLECTION_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  return { title: isCollectionType(type) ? COLLECTIONS[type].label : "Collections" };
}

export default async function CollectionListPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { type } = await params;
  const { deleted } = await searchParams;
  if (!isCollectionType(type)) notFound();

  const def = COLLECTIONS[type];
  await requireNewsroomUser(`/admin/collections/${type}`);

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const columns = ["id", "slug", "title", "is_published", "published_at", def.subtitleColumn]
    .filter(Boolean)
    .join(", ");

  const { data: items, error } = await supabase
    .from(def.table)
    .select(columns)
    .order("published_at", { ascending: false })
    .limit(200);

  const rows = (items ?? []) as unknown as Record<string, string | boolean | null>[];

  return (
    <div className="mx-auto max-w-4xl">
      <CollectionTabs active={type} />

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Collections</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">{def.label}</h1>
        </div>
        <Link
          href={`/admin/collections/${type}/new`}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          <Plus className="h-4 w-4" /> Add {aOrAn(def.singular)}
        </Link>
      </header>

      {deleted && (
        <p className="mt-6 rounded-lg bg-surface px-4 py-3 text-sm text-muted">Deleted.</p>
      )}

      {error && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          {error.message.includes("does not exist") || error.message.includes("schema cache")
            ? "These tables don't exist yet — run supabase/migrations/0014_collections.sql, then reload."
            : `Couldn't load ${def.label.toLowerCase()}: ${error.message}`}
        </p>
      )}

      {rows.length > 0 ? (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {rows.map((item) => {
            const id = String(item.id);
            const live = item.is_published !== false;
            const subtitle = def.subtitleColumn ? String(item[def.subtitleColumn] ?? "") : "";

            return (
              <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/collections/${type}/${id}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {String(item.title)}
                  </Link>
                  {subtitle && (
                    <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
                  )}
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    live
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                      : "bg-surface-muted text-muted"
                  )}
                >
                  {live ? "Live" : "Hidden"}
                </span>

                <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
                  {item.published_at
                    ? new Date(String(item.published_at)).toLocaleDateString()
                    : "—"}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  {live && (
                    <Link
                      href={`${def.publicPath}/${item.slug}`}
                      target="_blank"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                    >
                      View
                    </Link>
                  )}

                  <form action={toggleCollectionPublishedForm}>
                    <input type="hidden" name="type" value={type} />
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="published" value={live ? "false" : "true"} />
                    <button className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand">
                      {live ? "Hide" : "Publish"}
                    </button>
                  </form>

                  <form action={deleteCollectionItemForm}>
                    <input type="hidden" name="type" value={type} />
                    <input type="hidden" name="id" value={id} />
                    <ConfirmSubmit
                      message={`Permanently delete "${item.title}"? This cannot be undone.`}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-brand"
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !error && (
          <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-serif text-lg font-bold">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {def.publicPath} stays hidden from the site&apos;s navigation until
              this list has something in it.
            </p>
            <Link
              href={`/admin/collections/${type}/new`}
              className="mt-5 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
            >
              Add the first one
            </Link>
          </div>
        )
      )}
    </div>
  );
}

/** "Add a book" / "Add an issue" — small thing, but it reads as written. */
const aOrAn = (word: string) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);
