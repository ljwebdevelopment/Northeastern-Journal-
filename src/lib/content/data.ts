import type {
  Article,
  Author,
  Book,
  Category,
  Conversation,
  NewsletterIssue,
  Video,
} from "./types";

export const categories: Category[] = [
  { slug: "politics", name: "Politics", description: "Civic power, policy, and the people it affects." },
  { slug: "community", name: "Community", description: "The people and institutions shaping daily life." },
  { slug: "education", name: "Education", description: "Schools, learning, and the future of our classrooms." },
  { slug: "faith", name: "Faith", description: "Belief, congregation, and moral life in the region." },
  { slug: "culture", name: "Culture", description: "Art, tradition, and the stories we tell each other." },
  { slug: "history", name: "History", description: "The long memory of a place and its people." },
  { slug: "opinion", name: "Opinion", description: "Argued perspectives from our contributors." },
  { slug: "editorial", name: "Editorial", description: "The Journal's institutional voice." },
  { slug: "generations", name: "Generations", description: "Viewpoints across age and era, from longtime residents to first-time voters." },
  { slug: "interviews", name: "Interviews", description: "Conversations with the people making news." },
  { slug: "books", name: "Books", description: "Reviews, excerpts, and reading recommendations." },
  { slug: "local-news", name: "Local News", description: "Reporting from our home communities." },
  { slug: "national-news", name: "National News", description: "The stories shaping the country." },
  { slug: "world-news", name: "World News", description: "Dispatches beyond our borders." },
  { slug: "events", name: "Events", description: "Gatherings, forums, and civic calendars." },
  { slug: "community-voices", name: "Community Voices", description: "Reader-submitted letters and essays." },
];

/**
 * Editorial content is empty by design.
 *
 * The site previously shipped with a placeholder archive so it never looked
 * bare before the CMS was populated. It is now retired: everything readers
 * see — articles, bylines, books, videos, conversations, newsletter issues —
 * comes from Supabase, written by the newsroom. Sections with nothing in
 * them hide rather than showing filler.
 *
 * `categories` above stays. It is reference data, not content: it defines the
 * sections available to write into and is what `supabase-source.ts` validates
 * every article's category slug against.
 */
export const authors: Author[] = [];

export const articles: Article[] = [];

export const books: Book[] = [];

export const videos: Video[] = [];

export const conversations: Conversation[] = [];

export const newsletterIssues: NewsletterIssue[] = [];
