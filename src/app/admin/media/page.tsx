import NextImage from "next/image";
import { Images } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser } from "@/lib/auth/roles";
import { CopyLink } from "@/components/admin/copy-link";
import { MediaAltForm } from "@/components/admin/media-alt-form";
import { Pagination } from "@/components/shared/pagination";

export const metadata = { title: "Media" };

const PER_PAGE = 24;

/**
 * Everything that has been uploaded.
 *
 * The `media` table has recorded every upload since the first migration, but
 * nothing ever read it back — so an image used last March could only be found
 * by uploading it again. This is that missing half: find it, copy its URL,
 * reuse it, and fix the alt text you were in too much of a hurry to write.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page = "1", q = "" } = await searchParams;
  await requireNewsroomUser("/admin/media");

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const current = Math.max(1, Number(page) || 1);
  const from = (current - 1) * PER_PAGE;

  let query = supabase
    .from("media")
    .select("*, uploader:profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);

  if (q) query = query.or(`file_name.ilike.%${q}%,alt_text.ilike.%${q}%`);

  const { data: media, count, error } = await query;
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Media</h1>
          <p className="mt-2 text-sm text-muted">
            {(count ?? 0).toLocaleString()} file{count === 1 ? "" : "s"}. Images
            are uploaded from the article editor.
          </p>
        </div>

        <form role="search">
          <label htmlFor="q" className="sr-only">
            Search files
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search file names and alt text…"
            className="w-64 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
          />
        </form>
      </header>

      {error && (
        <p className="mt-6 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand">
          Couldn&apos;t load media: {error.message}
        </p>
      )}

      {media && media.length > 0 ? (
        <>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => {
              const uploader = item.uploader as unknown as {
                full_name: string | null;
                email: string;
              } | null;

              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="relative aspect-[4/3] bg-surface-muted">
                    {/* Unoptimized: these are already-served public URLs, and
                        running them back through the optimizer would cost a
                        transform per thumbnail for no benefit. */}
                    <NextImage
                      src={item.public_url}
                      alt={item.alt_text || ""}
                      fill
                      sizes="(min-width: 1024px) 300px, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="space-y-3 p-3">
                    <div>
                      <p className="truncate text-sm font-medium" title={item.file_name}>
                        {item.file_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(item.created_at).toLocaleDateString()}
                        {item.size_bytes && ` · ${formatBytes(item.size_bytes)}`}
                        {uploader && ` · ${uploader.full_name || uploader.email}`}
                      </p>
                    </div>

                    <CopyLink path={item.public_url} />

                    {/* Alt text is the one field worth editing after the fact:
                        it is what a blind reader gets instead of the picture,
                        and it is invariably skipped during a deadline upload. */}
                    <MediaAltForm id={item.id} altText={item.alt_text} />
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={current}
            pageCount={pageCount}
            basePath="/admin/media"
            params={{ q }}
          />
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Images className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 font-serif text-lg font-bold">
            {q ? "Nothing matched" : "No uploads yet"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {q
              ? `No files match "${q}".`
              : "Images added to an article appear here automatically."}
          </p>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
