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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
      admin_allowlist: Table<AllowlistRow>;
      categories: Table<CategoryRow>;
      authors: Table<AuthorRow>;
      tags: Table<TagRow>;
      articles: Table<ArticleRow>;
      article_tags: Table<{ article_id: string; tag_id: string }>;
      media: Table<MediaRow>;
      settings: Table<SettingRow>;
      subscribers: Table<SubscriberRow>;
      email_sends: Table<EmailSendRow>;
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
    };
    Enums: {
      user_role: UserRole;
      article_status: ArticleStatus;
      subscriber_status: SubscriberStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
