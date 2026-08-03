import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
import { ARTICLE_PROSE_CLASS } from "@/components/article/prose";
import { StatusBadge } from "@/components/admin/status-badge";
import { cn, formatDate } from "@/lib/utils";
import type { ArticleStatus } from "@/lib/supabase/types";

/**
 * Draft preview.
 *
 * The whole point is to read a piece before it is public, so this deliberately
 * has no sign-in: an editor shares the link with a source, a sub, or a lawyer,
 * and it opens. What protects it is that the token is a random uuid tied to one
 * article — knowing one tells you nothing about any other — and that it can be
 * rotated from the editor, which revokes every link already handed out.
 *
 * Three things follow from that, and all three are enforced below:
 *   - never cached (`dynamic`), so a rotated token stops working immediately
 *   - never indexed (`robots`), so a draft can't turn up in a search result
 *   - service-role read, so no new access is granted to `anon` on `articles`
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false, nocache: true },
};

const SELECT = `
  id, slug, title, subtitle, excerpt, body_html, status, published_at, scheduled_for, updated_at,
  featured_image_url, featured_image_alt, featured_image_caption, reading_minutes, word_count,
  category:categories(slug, name),
  author:authors(slug, name, role, photo_url)
`;

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // A malformed token isn't a lookup — uuid comparison would throw.
  if (!hasServiceRole || !/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = createAdminSupabase();
  const { data: row } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("preview_token", token)
    .maybeSingle();

  if (!row) notFound();

  const category = row.category as unknown as { slug: string; name: string } | null;
  const author = row.author as unknown as {
    slug: string;
    name: string;
    role: string;
    photo_url: string | null;
  } | null;

  const isLive = row.status === "published";

  return (
    <div className="content-container py-8 sm:py-10">
      {/* ---------------------------------------------------------------- */}
      {/* Preview banner — unmistakable, so nobody mistakes this for print  */}
      {/* ---------------------------------------------------------------- */}
      <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-brand/50 bg-brand/5 px-4 py-3">
        <span className="kicker text-brand">Preview</span>
        <StatusBadge status={row.status as ArticleStatus} scheduledFor={row.scheduled_for} />
        <p className="text-sm text-muted">
          {isLive
            ? "This article is already live."
            : "Not published. Anyone with this link can read it."}
        </p>
        {isLive && category && (
          <Link
            href={`/article/${category.slug}/${row.slug}`}
            className="text-sm font-semibold text-accent hover:underline"
          >
            Open the published version →
          </Link>
        )}
      </div>

      <article>
        <header className="mx-auto max-w-3xl">
          <p className="kicker">{category?.name ?? "Unfiled"}</p>

          <h1 className="mt-3 text-balance font-serif text-[2rem] font-bold leading-[1.12] sm:text-5xl">
            {row.title}
          </h1>

          {row.subtitle && (
            <p className="mt-4 text-balance font-serif text-xl leading-snug text-muted sm:text-2xl">
              {row.subtitle}
            </p>
          )}

          {row.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-muted">{row.excerpt}</p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-y border-border py-4 text-sm">
            {author && (
              <>
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                  {author.photo_url && (
                    <Image
                      src={author.photo_url}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{author.name}</p>
                  <p className="text-muted">
                    {row.published_at ? formatDate(row.published_at) : "Unpublished"} ·{" "}
                    {row.reading_minutes} min read · {row.word_count.toLocaleString()} words
                  </p>
                </div>
              </>
            )}
            {!author && <p className="text-muted">No byline set.</p>}
          </div>
        </header>

        {row.featured_image_url && (
          <figure className="mx-auto mt-8 max-w-4xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface-muted">
              <Image
                src={row.featured_image_url}
                alt={row.featured_image_alt || row.title}
                fill
                sizes="(min-width: 1024px) 900px, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
            {row.featured_image_caption && (
              <figcaption className="mt-2.5 text-sm leading-relaxed text-muted">
                {row.featured_image_caption}
              </figcaption>
            )}
          </figure>
        )}

        {row.body_html ? (
          <div
            className={cn(ARTICLE_PROSE_CLASS, "mt-10")}
            // Sanitized on write in `sanitizeArticleHtml` — see lib/richtext.ts.
            dangerouslySetInnerHTML={{ __html: row.body_html }}
          />
        ) : (
          <p className="mx-auto mt-10 max-w-[38rem] text-center text-muted">
            This article has no body yet.
          </p>
        )}

        <p className="mx-auto mt-12 max-w-[38rem] border-t border-border pt-6 text-xs text-muted">
          Last edited {new Date(row.updated_at).toLocaleString()}.
        </p>
      </article>
    </div>
  );
}
