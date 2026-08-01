import "server-only";

/**
 * Navigation is built from what the newsroom has actually published.
 *
 * A section with nothing in it is not a page worth linking to, so it stays
 * out of the header and footer until an article lands in it. Contributors
 * and the newsletter are evergreen and always shown.
 *
 * Cherokee Nana is a co-founder with her own profile, not a top-level
 * section — her hub is linked from the footer and her byline, not the
 * masthead.
 */
import { getArticles, getCategories } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";

export interface NavItem {
  label: string;
  href: string;
}

/** Preferred masthead order; anything else falls in behind. */
const PRIMARY_ORDER = [
  "local-news",
  "politics",
  "community",
  "education",
  "culture",
  "opinion",
  "editorial",
  "national-news",
  "world-news",
];

async function activeCategories() {
  const [articles, categories] = await Promise.all([getArticles(), getCategories()]);
  const used = new Set(articles.map((a) => a.category));
  return categories.filter((c) => used.has(c.slug));
}

export async function buildNav(): Promise<NavItem[]> {
  const categories = await activeCategories();

  const ranked = [...categories].sort((a, b) => {
    const ai = PRIMARY_ORDER.indexOf(a.slug);
    const bi = PRIMARY_ORDER.indexOf(b.slug);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const items: NavItem[] = ranked
    .slice(0, 6)
    .map((c) => ({ label: c.name, href: `/category/${c.slug}` }));

  items.push({ label: "Contributors", href: "/authors" });

  // Nothing published at all — keep the masthead from going bare.
  return items.length > 1 ? items : siteConfig.nav;
}

export async function buildFooterColumns(): Promise<
  { title: string; links: NavItem[] }[]
> {
  const categories = await activeCategories();
  const columns = siteConfig.footerColumns.map((c) => ({ ...c, links: [...c.links] }));

  if (categories.length === 0) return columns;

  // Replace the hardcoded Sections column with the sections that exist.
  return columns.map((column) =>
    column.title === "Sections"
      ? {
          ...column,
          links: categories
            .slice(0, 8)
            .map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
        }
      : column
  );
}
