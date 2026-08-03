import type { Metadata } from "next";
import Link from "next/link";
import { getTags } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tags",
  description:
    "Every subject the Northeastern Journal has covered, from the city budget to the county fair.",
  alternates: { canonical: `${siteConfig.url}/tag` },
};

export default async function TagIndexPage() {
  const tags = await getTags();

  // Size by frequency, so the index reads as a map of what this paper covers
  // rather than an alphabetical list of equal-looking words.
  const busiest = tags[0]?.count ?? 1;
  const weight = (count: number) => {
    const share = count / busiest;
    if (share > 0.66) return "text-2xl font-bold";
    if (share > 0.33) return "text-xl font-semibold";
    if (share > 0.15) return "text-lg font-semibold";
    return "text-base";
  };

  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Tags", href: "/tag" }]} />

      <header className="max-w-2xl">
        <p className="kicker">Archive</p>
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Tags</h1>
        <p className="mt-3 text-base text-muted">
          Every subject we&apos;ve written about. Tags cut across sections — a
          story about the school budget is tagged the same whether it ran in
          Education or Politics.
        </p>
      </header>

      {tags.length > 0 ? (
        <ul className="mt-12 flex flex-wrap items-baseline gap-x-5 gap-y-3">
          {tags.map((tag) => (
            <li key={tag.slug}>
              <Link
                href={`/tag/${encodeURIComponent(tag.slug)}`}
                className={`font-serif transition-colors hover:text-brand ${weight(tag.count)}`}
              >
                {tag.slug.replace(/-/g, " ")}
                <span className="ml-1.5 align-super text-xs font-normal text-muted">
                  {tag.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-12 text-sm text-muted">
          No tags yet. They appear here as soon as articles start carrying them.
        </p>
      )}
    </div>
  );
}
