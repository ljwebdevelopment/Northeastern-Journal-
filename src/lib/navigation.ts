/**
 * Navigation is derived from what the newsroom has actually published.
 *
 * A section with no articles in it is not a page worth linking to, so it
 * is left out of the header, the footer, and the sitemap until something
 * is published into it. That keeps a brand-new site from advertising a
 * dozen empty sections.
 */
import { getActiveCategories, getActiveSections } from "@/lib/content/api";
import { siteConfig } from "@/lib/site-config";

export interface NavItem {
  label: string;
  href: string;
}

/** Sections promoted to the top-level nav, in masthead order. */
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

export async function buildNav(): Promise<NavItem[]> {
  const [categories, sections] = await Promise.all([
    getActiveCategories(),
    getActiveSections(),
  ]);

  const ranked = [...categories].sort((a, b) => {
    const ai = PRIMARY_ORDER.indexOf(a.slug);
    const bi = PRIMARY_ORDER.indexOf(b.slug);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const items: NavItem[] = ranked
    .slice(0, 7)
    .map((c) => ({ label: c.name, href: `/category/${c.slug}` }));

  if (sections.conversations) items.push({ label: "Conversations", href: "/conversations" });
  if (sections.books) items.push({ label: "Books", href: "/books" });
  if (sections.videos) items.push({ label: "Videos", href: "/videos" });

  // Nothing published yet — fall back to the evergreen pages so the
  // masthead is never bare.
  return items.length > 0 ? items : siteConfig.nav;
}

export async function buildFooterColumns() {
  const [categories, sections] = await Promise.all([
    getActiveCategories(),
    getActiveSections(),
  ]);

  const columns = [...siteConfig.footerColumns.map((c) => ({ ...c, links: [...c.links] }))];

  if (categories.length > 0) {
    columns.unshift({
      title: "Sections",
      links: categories
        .slice(0, 8)
        .map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    });
  }

  const more: NavItem[] = [];
  if (sections.conversations) more.push({ label: "Conversations", href: "/conversations" });
  if (sections.books) more.push({ label: "Books", href: "/books" });
  if (sections.videos) more.push({ label: "Videos", href: "/videos" });
  if (more.length > 0) columns.push({ title: "More", links: more });

  return columns;
}
