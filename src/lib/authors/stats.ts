import type { Article, Author, Category, ProfessionalLink, ProfessionalLinkKind } from "@/lib/content/types";

export interface CategoryBreakdown {
  slug: string;
  name: string;
  count: number;
  /** Share of the author's output, 0–100. */
  share: number;
}

export interface AuthorStats {
  totalArticles: number;
  categoryCount: number;
  featuredCount: number;
  /** Articles flagged as most-read or trending. */
  popularCount: number;
  externalWorkCount: number;
  awardCount: number;
  firstPublishedAt?: string;
  lastPublishedAt?: string;
  /** Year the author started at the Journal, from `joinedAt` or their
   *  earliest article. */
  since?: string;
  breakdown: CategoryBreakdown[];
}

export function isPopular(article: Article): boolean {
  return Boolean(article.mostRead || article.trending);
}

export function buildAuthorStats(
  author: Author,
  articles: Article[],
  categories: Category[]
): AuthorStats {
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  }

  const total = articles.length;
  const breakdown: CategoryBreakdown[] = [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      name: categories.find((c) => c.slug === slug)?.name ?? slug,
      count,
      share: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // `articles` arrives newest-first from the content API.
  const lastPublishedAt = articles[0]?.publishedAt;
  const firstPublishedAt = articles[articles.length - 1]?.publishedAt;
  const sinceSource = author.joinedAt ?? firstPublishedAt;

  const links = author.professionalLinks ?? [];

  return {
    totalArticles: total,
    categoryCount: breakdown.length,
    featuredCount: articles.filter((a) => a.featured).length,
    popularCount: articles.filter(isPopular).length,
    externalWorkCount: links.filter((l) => l.kind !== "award").length,
    awardCount: links.filter((l) => l.kind === "award").length,
    firstPublishedAt,
    lastPublishedAt,
    since: sinceSource ? String(new Date(sinceSource).getFullYear()) : undefined,
    breakdown,
  };
}

export const professionalLinkGroups: {
  kind: ProfessionalLinkKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "syndicated",
    title: "Nationally Syndicated",
    description: "Columns and reporting carried by wire services and partner papers.",
  },
  {
    kind: "publication",
    title: "Other Publications",
    description: "Work published outside the Journal.",
  },
  {
    kind: "award",
    title: "Awards & Honors",
    description: "Recognition for reporting, writing, and service.",
  },
  {
    kind: "press",
    title: "Press & Appearances",
    description: "Interviews, panels, broadcasts, and podcasts.",
  },
  {
    kind: "portfolio",
    title: "Portfolio",
    description: "Personal collections and long-form archives.",
  },
];

export function groupProfessionalLinks(links: ProfessionalLink[] = []) {
  return professionalLinkGroups
    .map((group) => ({
      ...group,
      items: links.filter((link) => link.kind === group.kind),
    }))
    .filter((group) => group.items.length > 0);
}
