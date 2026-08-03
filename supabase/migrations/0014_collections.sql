-- =============================================================================
-- 0014 — Books, videos, conversations
-- -----------------------------------------------------------------------------
-- The content types that only existed in code. `/books`, `/videos`, and
-- `/conversations` read from a hardcoded array, so adding a book review meant a
-- deploy. These are their tables.
--
-- Newsletter issues are NOT here — migration 0010 already owns that table, and
-- its composer at /admin/newsletter is a far better tool than a generic form
-- would be.
--
-- They deliberately do NOT copy the articles table's full lifecycle. An
-- article has drafts, review, scheduling, announcements, and view counts
-- because a newsroom needs all of that for reporting. A book review needs one
-- question answered: is it up or not. So `is_published` is a boolean, and
-- there is no status enum, no scheduler, and no notification bookkeeping to
-- maintain for content that doesn't use it.
--
-- Additive. It creates what is missing and fills in columns on any of these
-- tables that already exist; it never drops, retypes, or deletes anything.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Books
-- ---------------------------------------------------------------------------

create table if not exists public.books (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  title              text not null,
  author_id          uuid references public.authors (id) on delete set null,
  cover_url          text,
  synopsis           text not null default '',
  review_excerpt     text not null default '',
  buy_url            text,
  reading_guide_url  text,

  is_published       boolean not null default true,
  published_at       timestamptz not null default now(),
  sort_order         int not null default 0,

  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.books is
  'Books by Journal writers, with the review and where to buy it.';

-- ---------------------------------------------------------------------------
-- 2. Videos
-- ---------------------------------------------------------------------------

create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text not null default '',
  -- The id only, not a full URL: the player builds its own embed, and storing
  -- a watch link would mean parsing it back out on every render.
  youtube_id    text not null,
  thumbnail_url text,
  category_id   uuid references public.categories (id) on delete set null,
  playlist      text,

  is_published  boolean not null default true,
  published_at  timestamptz not null default now(),
  sort_order    int not null default 0,

  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Conversations
-- ---------------------------------------------------------------------------
-- `participants` is an array of author slugs and `body` is JSONB, rather than
-- two more join tables. A conversation is read whole, always — every page that
-- wants one wants all of it — so splitting it across three tables would buy
-- referential integrity nobody queries and cost a join on every read.

create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  format       text not null default 'dialogue'
                 check (format in ('point-counterpoint', 'interview', 'roundtable', 'dialogue')),
  participants text[] not null default '{}',
  excerpt      text not null default '',
  -- [{ "speaker": "...", "text": "..." }, …] in running order.
  body         jsonb not null default '[]'::jsonb,
  image_url    text,

  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  sort_order   int not null default 0,

  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.conversations.body is
  'Ordered turns: [{"speaker": "Name", "text": "..."}]. Written by the newsroom editor, never by the public.';

-- ---------------------------------------------------------------------------
-- 4b. Reconcile tables that already existed
-- ---------------------------------------------------------------------------
-- `create table if not exists` creates nothing when a table of that name is
-- already there — including one made by hand in the dashboard with a different
-- set of columns. Nothing in this repo creates these three, but a table named
-- `books` or `videos` is an easy thing for someone to have added ad hoc, and
-- the failure mode is silent: the CREATE succeeds by doing nothing, and every
-- read then fails with "column does not exist".
--
-- So state every column again as an additive ALTER. On a fresh database these
-- are all no-ops; on an existing one they fill in whatever is missing without
-- touching a single row of data. Nothing here drops or retypes a column — if
-- an existing column has the wrong type, that is a decision for a person, not
-- for a migration running unattended.

alter table public.books
  add column if not exists author_id         uuid references public.authors (id) on delete set null,
  add column if not exists cover_url         text,
  add column if not exists synopsis          text not null default '',
  add column if not exists review_excerpt    text not null default '',
  add column if not exists buy_url           text,
  add column if not exists reading_guide_url text,
  add column if not exists is_published      boolean not null default true,
  add column if not exists published_at      timestamptz not null default now(),
  add column if not exists sort_order        int not null default 0,
  add column if not exists created_by        uuid references public.profiles (id) on delete set null,
  add column if not exists created_at        timestamptz not null default now(),
  add column if not exists updated_at        timestamptz not null default now();

alter table public.videos
  add column if not exists description   text not null default '',
  add column if not exists youtube_id    text not null default '',
  add column if not exists thumbnail_url text,
  add column if not exists category_id   uuid references public.categories (id) on delete set null,
  add column if not exists playlist      text,
  add column if not exists is_published  boolean not null default true,
  add column if not exists published_at  timestamptz not null default now(),
  add column if not exists sort_order    int not null default 0,
  add column if not exists created_by    uuid references public.profiles (id) on delete set null,
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists updated_at    timestamptz not null default now();

alter table public.conversations
  add column if not exists format       text not null default 'dialogue',
  add column if not exists participants text[] not null default '{}',
  add column if not exists excerpt      text not null default '',
  add column if not exists body         jsonb not null default '[]'::jsonb,
  add column if not exists image_url    text,
  add column if not exists is_published boolean not null default true,
  add column if not exists published_at timestamptz not null default now(),
  add column if not exists sort_order   int not null default 0,
  add column if not exists created_by   uuid references public.profiles (id) on delete set null,
  add column if not exists created_at   timestamptz not null default now(),
  add column if not exists updated_at   timestamptz not null default now();


create index if not exists books_published_idx
  on public.books (is_published, published_at desc);
create index if not exists videos_published_idx
  on public.videos (is_published, published_at desc);
create index if not exists conversations_published_idx
  on public.conversations (is_published, published_at desc);

-- ---------------------------------------------------------------------------
-- 5. Timestamps
-- ---------------------------------------------------------------------------

drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();

drop trigger if exists videos_touch on public.videos;
create trigger videos_touch before update on public.videos
  for each row execute function public.touch_updated_at();

drop trigger if exists conversations_touch on public.conversations;
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------
-- Same shape for all four, and the same shape as articles: the public sees
-- what is published and dated; anyone who can write sees everything and can
-- edit it. Publishing these is not restricted to editors — unlike an article,
-- a book review carries no byline risk and no newsletter blast.

alter table public.books         enable row level security;
alter table public.videos        enable row level security;
alter table public.conversations enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['books', 'videos', 'conversations']
  loop
    execute format('drop policy if exists "%s public read" on public.%I', t, t);
    execute format(
      'create policy "%s public read" on public.%I
         for select to anon, authenticated
         using (is_published = true and published_at <= now())', t, t);

    execute format('drop policy if exists "%s writer read" on public.%I', t, t);
    execute format(
      'create policy "%s writer read" on public.%I
         for select to authenticated using (public.can_write())', t, t);

    execute format('drop policy if exists "%s writer write" on public.%I', t, t);
    execute format(
      'create policy "%s writer write" on public.%I
         for all to authenticated
         using (public.can_write()) with check (public.can_write())', t, t);

    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
