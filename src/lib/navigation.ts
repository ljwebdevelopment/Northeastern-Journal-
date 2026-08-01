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
import {
  getArticles,
  getAuthorBySlug,
  getBooks,
  getCategories,
  getConversations,
  getVideos,
} from "@/lib/content/api";
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

  // Nothing published at all. Fall back to evergreen pages rather than
  // section links, which 404 while their sections are empty.
  return items.length > 1 ? items : siteConfig.nav;
}

export async function buildFooterColumns(): Promise<
  { title: string; links: NavItem[] }[]
> {
  const [categories, books, videos, conversations, cherokeeNana] = await Promise.all([
    activeCategories(),
    getBooks(),
    getVideos(),
    getConversations(),
    getAuthorBySlug("cherokee-nana"),
  ]);

  const columns: { title: string; links: NavItem[] }[] = [];

  // Sections only appear once they hold something — their pages 404 while
  // empty, and a footer full of dead links is worse than a shorter footer.
  if (categories.length > 0) {
    columns.push({
      title: "Sections",
      links: categories
        .slice(0, 8)
        .map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    });
  }

  // Her hub 404s if the byline isn't in the database, so don't advertise it.
  columns.push(
    ...siteConfig.footerColumns.map((column) => ({
      ...column,
      links: column.links.filter(
        (link) => link.href !== "/cherokee-nana" || Boolean(cherokeeNana)
      ),
    }))
  );

  const collections: NavItem[] = [];
  if (conversations.length > 0) collections.push({ label: "Conversations", href: "/conversations" });
  if (books.length > 0) collections.push({ label: "Books", href: "/books" });
  if (videos.length > 0) collections.push({ label: "Videos", href: "/videos" });
  if (collections.length > 0) columns.push({ title: "Collections", links: collections });

  return columns;
}
