/**
 * CMS-agnostic content models. Every page in the app reads through the
 * functions in `lib/content/api.ts`, which currently resolve against the
 * local placeholder dataset in `lib/content/data.ts`. Swapping in
 * WordPress, Sanity, Strapi, Contentful, or Payload later only requires
 * re-implementing `api.ts` against these same shapes.
 */

export type CategorySlug =
  | "politics"
  | "community"
  | "education"
  | "faith"
  | "culture"
  | "history"
  | "opinion"
  | "editorial"
  | "family-perspectives"
  | "interviews"
  | "books"
  | "local-news"
  | "national-news"
  | "world-news"
  | "events"
  | "community-voices";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  x?: string;
  tiktok?: string;
  substack?: string;
  linkedin?: string;
  youtube?: string;
  /** Legacy alias for `x`, kept so existing data keeps resolving. */
  twitter?: string;
}

export type SocialPlatform = keyof SocialLinks;

/**
 * Work an author has published, won, or appeared in outside the Journal.
 * Grouped on the public profile by `kind`.
 */
export type ProfessionalLinkKind =
  | "syndicated"
  | "publication"
  | "award"
  | "press"
  | "portfolio";

export interface ProfessionalLink {
  id: string;
  kind: ProfessionalLinkKind;
  /** Headline, award name, segment title, or portfolio label. */
  title: string;
  /** Outlet, wire service, granting body, or program name. */
  outlet?: string;
  url?: string;
  /** Free-form year or date label ("2024", "Spring 2023"). */
  year?: string;
  description?: string;
}

export interface Author {
  slug: string;
  name: string;
  /** Job title — Editor, Publisher, Columnist, etc. */
  role: string;
  photo: string;
  /** One- or two-sentence bio used in cards and bylines. */
  bio: string;
  /** Full "About the Author" biography. */
  longBio: string;
  location?: string;
  /** Optional public contact address. Omitted from the page when unset. */
  email?: string;
  website?: string;
  /** Pull quote displayed in the profile hero. */
  featuredQuote?: string;
  social: SocialLinks;
  professionalLinks?: ProfessionalLink[];
  relatedTopics: CategorySlug[];
  /** ISO date the author joined the Journal, used in profile statistics. */
  joinedAt?: string;
  /** ISO timestamp of the last dashboard profile edit. */
  updatedAt?: string;
}

/** Fields an author may edit from the dashboard. Slug is never editable. */
export type AuthorProfileInput = Omit<Author, "slug" | "updatedAt">;

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  body: string[]; // paragraphs
  category: CategorySlug;
  authorSlug: string;
  publishedAt: string; // ISO
  updatedAt?: string;
  image: string;
  imageAlt: string;
  tags: string[];
  featured?: boolean;
  trending?: boolean;
  mostRead?: boolean;
  breaking?: boolean;
  region?: "local" | "national" | "world";
  /**
   * True for placeholder/showcase articles seeded before the CMS is
   * connected. Demo articles are automatically superseded by real
   * (non-demo) articles once any exist in the same context, and can be
   * hidden from indexing entirely via `demoContentConfig`. See
   * `lib/content/demo-config.ts`.
   */
  isDemo?: boolean;
}

export interface Book {
  slug: string;
  title: string;
  authorSlug: string;
  cover: string;
  synopsis: string;
  reviewExcerpt: string;
  buyUrl: string;
  publishedAt: string;
  readingGuideUrl?: string;
}

export interface Video {
  slug: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnail: string;
  category: CategorySlug;
  publishedAt: string;
  playlist?: string;
}

export interface Conversation {
  slug: string;
  title: string;
  format: "point-counterpoint" | "interview" | "roundtable" | "dialogue";
  participants: string[]; // author slugs
  excerpt: string;
  body: { speaker: string; text: string }[];
  publishedAt: string;
  image: string;
}

export interface NewsletterIssue {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  issueNumber: number;
}
