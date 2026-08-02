/**
 * Hand-maintained mirror of the Postgres schema in
 * `supabase/migrations/0001_initial_schema.sql`.
 *
 * If you change the SQL, change this file too — or regenerate it with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type UserRole = "admin" | "editor" | "contributor" | "reader";
export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";
export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed" | "bounced";
export type Region = "local" | "national" | "world";
export type NewsletterStatus = "draft" | "sent";

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

  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Migration 0009. The public site never selects this table directly — reads go
 * through `get_article_comments`, which omits `delete_token` and the request
 * metadata. This shape is the full row, as staff moderation sees it.
 */
export type ArticleCommentRow = {
  id: string;
  article_id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  delete_token: string;
  deleted_at: string | null;
  hidden_at: string | null;
  created_at: string;
  author_ip: string | null;
  author_user_agent: string | null;
}

/** What `get_article_comments` returns — the safe, public projection. */
export type PublicCommentRow = {
  id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  is_deleted: boolean;
  created_at: string;
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
  consent_ip: string | null;
  consent_user_agent: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Migration 0010. One item as it appears in a rendered issue.
 *
 * A flattened copy rather than an article reference: this is what gets frozen
 * into `newsletter_issues.snapshot` at send time so the archive keeps showing
 * what subscribers received, even if the article changes later.
 */
export type NewsletterItem = {
  slug: string;
  title: string;
  excerpt: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string;
  categoryName: string | null;
  authorName: string | null;
  publishedAt: string;
  readingMinutes: number | null;
  viewCount: number | null;
};

export type NewsletterSnapshot = {
  lead: NewsletterItem | null;
  latest: NewsletterItem[];
  trending: NewsletterItem[];
};

export type NewsletterIssueRow = {
  id: string;
  issue_number: number;
  slug: string;
  title: string;
  summary: string;
  intro: string;
  status: NewsletterStatus;

  lead_article_id: string | null;
  latest_ids: string[];
  trending_ids: string[];

  snapshot: NewsletterSnapshot | null;

  sent_at: string | null;
  recipients: number;
  succeeded: number;
  failed: number;

  created_by: string | null;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailSendRow = {
  id: string;
  article_id: string | null;
  /** Set when the send was a newsletter issue (migration 0010). */
  newsletter_issue_id: string | null;
  subject: string;
  recipients: number;
  succeeded: number;
  failed: number;
  sent_by: string | null;
  error: string | null;
  created_at: string;
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
      article_comments: Table<ArticleCommentRow>;
      media: Table<MediaRow>;
      settings: Table<SettingRow>;
      subscribers: Table<SubscriberRow>;
      email_sends: Table<EmailSendRow>;
      newsletter_issues: Table<NewsletterIssueRow>;
    };
    // `{ [_ in never]: never }` — an empty object type. `Record<string, never>`
    // would make every key resolve to `never` when supabase-js intersects
    // Tables with Views, collapsing every query result to `never`.
    Views: { [_ in never]: never };
    Functions: {
      publish_due_articles: { Args: Record<string, never>; Returns: ArticleRow[] };
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      can_write: { Args: Record<string, never>; Returns: boolean };
      increment_article_view: { Args: { article_slug: string }; Returns: number | null };
      set_article_like: {
        Args: { article_slug: string; liked: boolean };
        Returns: number | null;
      };
      get_article_comments: { Args: { article_slug: string }; Returns: PublicCommentRow[] };
      add_article_comment: {
        Args: {
          article_slug: string;
          comment_author: string;
          comment_body: string;
          reply_to?: string | null;
          ip?: string | null;
          user_agent?: string | null;
        };
        Returns: {
          id: string;
          parent_id: string | null;
          delete_token: string;
          created_at: string;
        }[];
      };
      delete_article_comment: {
        Args: { comment_id: string; token: string };
        Returns: boolean;
      };
      author_subscriber_count: { Args: { author_slug: string }; Returns: number };
      author_subscriber_counts: {
        Args: Record<string, never>;
        Returns: { author_slug: string; subscribers: number }[];
      };
      check_rate_limit: {
        Args: { limit_key: string; max_hits: number; window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      article_status: ArticleStatus;
      subscriber_status: SubscriberStatus;
      newsletter_status: NewsletterStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
