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
  substack?: string;
  youtube?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
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
}

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
