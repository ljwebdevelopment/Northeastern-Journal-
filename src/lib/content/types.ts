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
  | "generations"
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
  substack?: string;
  youtube?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

/** A pull quote shown on the author's profile. */
export interface AuthorQuote {
  id: string;
  text: string;
  source?: string;
}

/** Something the author recommends reading. */
export interface ReadingListItem {
  id: string;
  title: string;
  note?: string;
  url?: string;
}

/** A career milestone on the profile timeline. */
export interface TimelineEntry {
  id: string;
  year: string;
  label: string;
}

export type ProfessionalLinkKind =
  | "syndicated"
  | "publication"
  | "award"
  | "press"
  | "portfolio";

/** Work published, won, or appeared in outside the Journal. */
export interface ProfessionalLink {
  id: string;
  kind: ProfessionalLinkKind;
  title: string;
  outlet?: string;
  url?: string;
  year?: string;
  description?: string;
}

export interface Author {
  slug: string;
  name: string;
  role: string;
  photo: string;
  bio: string;
  longBio: string;
  social: SocialLinks;
  relatedTopics: CategorySlug[];
  /** Optional handle, shown as @username and usable in the profile URL. */
  username?: string;
  location?: string;
  email?: string;
  website?: string;
  featuredQuote?: string;
  /** Standing beyond the job title — "Co-Founder". Rendered as a badge. */
  foundingRole?: string;
  quotes?: AuthorQuote[];
  readingList?: ReadingListItem[];
  timeline?: TimelineEntry[];
  professionalLinks?: ProfessionalLink[];
  videoPlaylist?: string;
  speaking?: string;
  podcastUrl?: string;
  showSubscriberCount?: boolean;
}

export interface Article {
  /** Supabase row id. Absent for the built-in placeholder archive. */
  id?: string;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  /** Sanitized HTML from the editor. This is what article pages render. */
  bodyHtml: string;
  /** Paragraph-split plain text. Kept for feeds, search, and word counts. */
  body: string[];
  category: CategorySlug;
  authorSlug: string;
  publishedAt: string; // ISO
  updatedAt?: string;
  image: string;
  imageAlt: string;
  imageCaption?: string;
  tags: string[];
  /** SEO overrides set in the CMS; fall back to title/excerpt when empty. */
  seoTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  /** Stored at save time so the reader sees the same number as the editor. */
  readingMinutes?: number;
  wordCount?: number;
  /** Reads recorded for this article. Placeholder archive entries have none. */
  viewCount?: number;
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
