import type { Metadata } from "next";
import Link from "next/link";
import { createPublicSupabase } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Letters to the editor",
  description:
    "Readers of the Northeastern Journal respond to our reporting, correct the record, and argue back.",
  alternates: { canonical: `${siteConfig.url}/letters` },
};

/**
 * Published letters.
 *
 * Reads `letters_public`, a view that carries the name, the town, and the
 * words — and nothing else. The email address never leaves the `letters`
 * table, which `anon` has no access to at all.
 */
export default async function LettersPage() {
  const supabase = createPublicSupabase();

  const { data: letters } = supabase
    ? await supabase
        .from("letters_public")
        .select("id, name, location, subject, body, created_at, article_id")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: null };

  // Resolve the pieces being answered in one round trip rather than per row.
  const articleIds = [...new Set((letters ?? []).map((l) => l.article_id).filter(Boolean))];
  const { data: articles } = supabase && articleIds.length
    ? await supabase
        .from("articles")
        .select("id, slug, title, category:categories(slug)")
        .in("id", articleIds as string[])
    : { data: null };

  const articleById = new Map(
    (articles ?? []).map((a) => [
      a.id,
      {
        title: a.title,
        href: `/article/${(a.category as unknown as { slug: string } | null)?.slug ?? "local-news"}/${a.slug}`,
      },
    ])
  );

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Letters", href: "/letters" }]} />

      <header className="max-w-2xl">
        <p className="kicker">Readers</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
          Letters to the editor
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          What readers make of our reporting — corrections, arguments, and the
          local knowledge we didn&apos;t have.
        </p>
        <Link
          href="/letters/new"
          className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          Write to the editor
        </Link>
      </header>

      {letters && letters.length > 0 ? (
        <div className="mt-12 space-y-10 border-t border-border pt-10">
          {letters.map((letter) => {
            const responseTo = letter.article_id
              ? articleById.get(letter.article_id)
              : undefined;
            return (
              <article key={letter.id} className="mx-auto max-w-[42rem]">
                {letter.subject && (
                  <h2 className="font-serif text-2xl font-bold">{letter.subject}</h2>
                )}
                {responseTo && (
                  <p className="mt-1 text-sm text-muted">
                    In response to{" "}
                    <Link href={responseTo.href} className="text-accent hover:underline">
                      {responseTo.title}
                    </Link>
                  </p>
                )}
                <div className="mt-4 whitespace-pre-line text-[1.0625rem] leading-[1.75]">
                  {letter.body}
                </div>
                <footer className="mt-4 text-sm text-muted">
                  <span className="font-semibold text-foreground">{letter.name}</span>
                  {letter.location && <>, {letter.location}</>}
                  {" · "}
                  <time dateTime={letter.created_at}>{formatDate(letter.created_at)}</time>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-serif text-lg font-bold">No letters published yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Be the first. We read everything that arrives.
          </p>
        </div>
      )}
    </div>
  );
}
