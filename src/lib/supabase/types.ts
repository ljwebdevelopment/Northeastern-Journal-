/**
 * Hand-maintained mirror of the Postgres schema in
 * `supabase/migrations/0001_initial_schema.sql`.
 *
 * If you change the SQL, change this file too — or regenerate it with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type UserRole = "admin" | "editor" | "contributor" | "reader";
export type ArticleStatus =
  | "draft"
  | "in_review"
  | "scheduled"
  | "published"
  | "archived";
export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed" | "bounced";
export type Region = "local" | "national" | "world";

/** How often a subscriber wants email. */
export type EmailFrequency = "immediate" | "daily" | "weekly";

export type EditorialNoteKind =
  | "comment"
  | "submitted"
  | "changes_requested"
  | "approved";
export type RevisionKind = "autosave" | "manual" | "publish";
export type LetterStatus = "pending" | "approved" | "rejected";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AllowlistRow = {
  email: string;
  role: UserRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export type AuthorRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  photo_url: string | null;
  bio: string;
  long_bio: string;
  email: string | null;
  social: Record<string, string>;
  related_topics: string[];
  is_active: boolean;
  username: string | null;
  location: string | null;
  website: string | null;
  featured_quote: string | null;
  founding_role: string | null;
  quotes: AuthorQuoteRow[];
  reading_list: ReadingListRow[];
  timeline: TimelineRow[];
  professional_links: ProfessionalLinkRow[];
  video_playlist: string | null;
  speaking: string | null;
  podcast_url: string | null;
  show_subscriber_count: boolean;
  created_at: string;
  updated_at: string;
}

/** Shapes stored in the `authors` JSONB columns (migration 0007). */
export type AuthorQuoteRow = { id: string; text: string; source?: string };
export type ReadingListRow = { id: string; title: string; note?: string; url?: string };
export type TimelineRow = { id: string; year: string; label: string };
export type ProfessionalLinkRow = {
  id: string;
  kind: "syndicated" | "publication" | "award" | "press" | "portfolio";
  title: string;
  outlet?: string;
  url?: string;
  year?: string;
  description?: string;
};

export type SubscriberAuthorRow = {
  subscriber_id: string;
  author_id: string;
  created_at: string;
}

export type TagRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  body_html: string;
  body_markdown: string | null;

  status: ArticleStatus;
  published_at: string | null;
  scheduled_for: string | null;

  category_id: string | null;
  author_id: string | null;
  created_by: string | null;
  updated_by: string | null;

  featured_image_url: string | null;
  featured_image_alt: string;
  featured_image_caption: string | null;

  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;

  reading_minutes: number;
  word_count: number;
  region: Region | null;

  is_featured: boolean;
  is_breaking: boolean;
  is_trending: boolean;

  notify_subscribers: boolean;
  notified_at: string | null;

  /** Unguessable id behind /preview/<token> (migration 0010). */
  preview_token: string;

  view_count: number;
  created_at: string;
  updated_at: string;
}

export type EditorialNoteRow = {
  id: string;
  article_id: string;
  author_id: string | null;
  kind: EditorialNoteKind;
  body: string;
  resolved_at: string | null;
  created_at: string;
}

export type ArticleRevisionRow = {
  id: string;
  article_id: string;
  created_by: string | null;
  kind: RevisionKind;
  title: string;
  subtitle: string | null;
  excerpt: string;
  body_html: string;
  body_markdown: string | null;
  word_count: number;
  created_at: string;
}

export type LetterRow = {
  id: string;
  name: string;
  email: string;
  location: string | null;
  subject: string;
  body: string;
  article_id: string | null;
  status: LetterStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  editor_note: string | null;
  consent_ip: string | null;
  consent_user_agent: string | null;
  created_at: string;
}

/** The public projection of a letter — no address, no moderation trail. */
export type LetterPublicRow = Pick<
  LetterRow,
  "id" | "name" | "location" | "subject" | "body" | "article_id" | "created_at"
>;

export type SubscriberCategoryRow = {
  subscriber_id: string;
  category_id: string;
  created_at: string;
}

export type ArticleViewsDailyRow = {
  article_id: string;
  day: string;
  views: number;
}

/** An article row joined with its category, author, and tags. */
export type ArticleWithRelations = ArticleRow & {
  category: Pick<CategoryRow, "slug" | "name"> | null;
  author: Pick<AuthorRow, "slug" | "name" | "role" | "photo_url" | "bio"> | null;
  article_tags: { tag: Pick<TagRow, "slug" | "name"> | null }[] | null;
}

export type MediaRow = {
  id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string | null;
  credit: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  confirm_token: string;
  unsubscribe_token: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  source: string;
  frequency: EmailFrequency;
  consent_ip: string | null;
  consent_user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailSendRow = {
  id: string;
  article_id: string | null;
  subject: string;
  recipients: number;
  succeeded: number;
  failed: number;
  sent_by: string | null;
  error: string | null;
  created_at: string;
}

// --- Collections (migration 0012) -------------------------------------------
// Books, videos, conversations, and newsletter issues. All four share the same
// simple lifecycle — `is_published` plus a date — rather than the article
// status enum, because none of them are drafted, reviewed, or announced.

export type CollectionBase = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BookRow = CollectionBase & {
  author_id: string | null;
  cover_url: string | null;
  synopsis: string;
  review_excerpt: string;
  buy_url: string | null;
  reading_guide_url: string | null;
  sort_order: number;
}

export type VideoRow = CollectionBase & {
  description: string;
  youtube_id: string;
  thumbnail_url: string | null;
  category_id: string | null;
  playlist: string | null;
  sort_order: number;
}

export type ConversationTurn = { speaker: string; text: string };

export type ConversationRow = CollectionBase & {
  format: "point-counterpoint" | "interview" | "roundtable" | "dialogue";
  participants: string[];
  excerpt: string;
  body: ConversationTurn[];
  image_url: string | null;
  sort_order: number;
}

export type NewsletterIssueRow = CollectionBase & {
  summary: string;
  body_html: string;
  issue_number: number;
}

export type SettingRow = {
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      subscriber_authors: Table<SubscriberAuthorRow>;
      admin_allowlist: Table<AllowlistRow>;
      categories: Table<CategoryRow>;
      authors: Table<AuthorRow>;
      tags: Table<TagRow>;
      articles: Table<ArticleRow>;
      article_tags: Table<{ article_id: string; tag_id: string }>;
      media: Table<MediaRow>;
      settings: Table<SettingRow>;
      subscribers: Table<SubscriberRow>;
      subscriber_categories: Table<SubscriberCategoryRow>;
      email_sends: Table<EmailSendRow>;
      editorial_notes: Table<EditorialNoteRow>;
      article_revisions: Table<ArticleRevisionRow>;
      letters: Table<LetterRow>;
      article_views_daily: Table<ArticleViewsDailyRow>;
      books: Table<BookRow>;
      videos: Table<VideoRow>;
      conversations: Table<ConversationRow>;
      newsletter_issues: Table<NewsletterIssueRow>;
    };
    // `{ [_ in never]: never }` — an empty object type. `Record<string, never>`
    // would make every key resolve to `never` when supabase-js intersects
    // Tables with Views, collapsing every query result to `never`.
    Views: {
      letters_public: Table<LetterPublicRow, never, never>;
    };
    Functions: {
      publish_due_articles: { Args: Record<string, never>; Returns: ArticleRow[] };
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      can_write: { Args: Record<string, never>; Returns: boolean };
      increment_article_view: { Args: { article_slug: string }; Returns: number | null };
      author_subscriber_count: { Args: { author_slug: string }; Returns: number };
      author_subscriber_counts: {
        Args: Record<string, never>;
        Returns: { author_slug: string; subscribers: number }[];
      };
      check_rate_limit: {
        Args: { limit_key: string; max_hits: number; window_seconds: number };
        Returns: boolean;
      };
      subscriber_preferences: {
        Args: { token: string };
        Returns: {
          email: string;
          name: string | null;
          status: SubscriberStatus;
          frequency: EmailFrequency;
          category_slugs: string[];
          author_slugs: string[];
        }[];
      };
      save_subscriber_preferences: {
        Args: {
          token: string;
          new_frequency?: EmailFrequency | null;
          category_slugs?: string[] | null;
          author_slugs?: string[] | null;
        };
        Returns: boolean;
      };
      daily_reads: {
        Args: { days?: number };
        Returns: { day: string; views: number }[];
      };
      top_articles: {
        Args: { days?: number; limit_count?: number };
        Returns: {
          article_id: string;
          title: string;
          slug: string;
          category_slug: string | null;
          views: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      article_status: ArticleStatus;
      subscriber_status: SubscriberStatus;
      editorial_note_kind: EditorialNoteKind;
      revision_kind: RevisionKind;
      letter_status: LetterStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
