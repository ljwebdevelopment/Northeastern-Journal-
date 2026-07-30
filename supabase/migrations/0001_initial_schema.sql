-- ===========================================================================
-- Northeastern Journal — initial schema
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query),
-- or with `supabase db push` if you use the Supabase CLI.
--
-- Safe to re-run: everything is guarded with IF NOT EXISTS / ON CONFLICT.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('admin', 'editor', 'contributor', 'reader');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.article_status as enum ('draft', 'scheduled', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscriber_status as enum ('pending', 'confirmed', 'unsubscribed', 'bounced');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Who is allowed in
-- ---------------------------------------------------------------------------
-- `admin_allowlist` is the bootstrap mechanism. When someone signs in for the
-- first time, the `handle_new_user` trigger looks their email up here to decide
-- what role their profile gets. Anyone not listed becomes a plain 'reader'.
-- Admins add future writers by inserting a row here (the /admin/team page does
-- this for them) — no code change and no SQL required.

create table if not exists public.admin_allowlist (
  email       text primary key,
  role        public.user_role not null default 'contributor',
  invited_by  uuid references auth.users (id) on delete set null,
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz
);

comment on table public.admin_allowlist is
  'Email -> role mapping applied at first sign-in. Seeded with the two founding administrators.';

insert into public.admin_allowlist (email, role) values
  ('lljohnson1201@gmail.com', 'admin'),
  ('caleeds77@gmail.com',     'admin')
on conflict (email) do update set role = excluded.role;

-- ---------------------------------------------------------------------------
-- 3. Profiles (one row per authenticated user)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        public.user_role not null default 'reader',
  author_id   uuid,                       -- FK added after `authors` exists
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- 4. Role helper functions
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so RLS policies can read `profiles` without recursing into
-- the policies on `profiles` itself.

create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'reader'::public.user_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() = 'admin'::public.user_role;
$$;

-- Admin or editor: full editorial control, including publishing.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() in ('admin'::public.user_role, 'editor'::public.user_role);
$$;

-- Anyone who may create content. Contributors can write but not publish.
create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() in (
    'admin'::public.user_role,
    'editor'::public.user_role,
    'contributor'::public.user_role
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. New-user trigger: create a profile and apply the allowlist role
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_role public.user_role;
begin
  select role into allowed_role
  from public.admin_allowlist
  where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(allowed_role, 'reader'::public.user_role)
  )
  on conflict (id) do update
    set email = excluded.email,
        role  = coalesce(allowed_role, public.profiles.role);

  update public.admin_allowlist
     set accepted_at = coalesce(accepted_at, now())
   where lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. Editorial content
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  sort_order  int  not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.authors (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  role           text not null default 'Contributor',
  photo_url      text,
  bio            text not null default '',
  long_bio       text not null default '',
  email          text,
  social         jsonb not null default '{}'::jsonb,
  related_topics text[] not null default '{}',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Link a login to its public byline.
do $$ begin
  alter table public.profiles
    add constraint profiles_author_id_fkey
    foreign key (author_id) references public.authors (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  title                  text not null,
  subtitle               text,
  excerpt                text not null default '',
  body_html              text not null default '',
  body_markdown          text,

  status                 public.article_status not null default 'draft',
  published_at           timestamptz,
  scheduled_for          timestamptz,

  category_id            uuid references public.categories (id) on delete set null,
  author_id              uuid references public.authors (id) on delete set null,
  created_by             uuid references public.profiles (id) on delete set null,
  updated_by             uuid references public.profiles (id) on delete set null,

  featured_image_url     text,
  featured_image_alt     text not null default '',
  featured_image_caption text,

  seo_title              text,
  meta_description       text,
  canonical_url          text,

  reading_minutes        int  not null default 1,
  word_count             int  not null default 0,
  region                 text check (region in ('local', 'national', 'world')),

  is_featured            boolean not null default false,
  is_breaking            boolean not null default false,
  is_trending            boolean not null default false,

  -- Newsletter announcement bookkeeping. `notified_at` is the guard that stops
  -- the same article being emailed twice.
  notify_subscribers     boolean not null default false,
  notified_at            timestamptz,

  view_count             bigint not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);
create index if not exists articles_category_idx on public.articles (category_id);
create index if not exists articles_author_idx   on public.articles (author_id);
create index if not exists articles_scheduled_idx
  on public.articles (scheduled_for) where status = 'scheduled';

-- Full-text search over the published archive.
create index if not exists articles_search_idx on public.articles
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '')));

create table if not exists public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

-- Metadata for everything uploaded to the `media` storage bucket.
create table if not exists public.media (
  id          uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url  text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  width       int,
  height      int,
  alt_text    text not null default '',
  caption     text,
  credit      text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Newsletter
-- ---------------------------------------------------------------------------
-- Subscriber rows are never readable by the public. All writes go through
-- server routes using the service-role key.

create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  name              text,
  status            public.subscriber_status not null default 'pending',

  -- Double opt-in + one-click unsubscribe tokens.
  confirm_token     uuid not null default gen_random_uuid(),
  unsubscribe_token uuid not null default gen_random_uuid(),

  confirmed_at      timestamptz,
  unsubscribed_at   timestamptz,

  -- CAN-SPAM / GDPR evidence of consent.
  source            text not null default 'website',
  consent_ip        text,
  consent_user_agent text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists subscribers_status_idx on public.subscribers (status);
create unique index if not exists subscribers_confirm_token_idx
  on public.subscribers (confirm_token);
create unique index if not exists subscribers_unsubscribe_token_idx
  on public.subscribers (unsubscribe_token);

-- Audit trail of every broadcast, so the dashboard can show what went out.
create table if not exists public.email_sends (
  id           uuid primary key default gen_random_uuid(),
  article_id   uuid references public.articles (id) on delete set null,
  subject      text not null,
  recipients   int  not null default 0,
  succeeded    int  not null default 0,
  failed       int  not null default 0,
  sent_by      uuid references public.profiles (id) on delete set null,
  error        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. Triggers: timestamps, slugs, reading time, publish rules
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

drop trigger if exists authors_touch on public.authors;
create trigger authors_touch before update on public.authors
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists subscribers_touch on public.subscribers;
create trigger subscribers_touch before update on public.subscribers
  for each row execute function public.touch_updated_at();

-- Contributors may write and submit, but only admins and editors may push an
-- article live. Enforced here rather than in RLS because it depends on the
-- *value* of a single column rather than on row ownership.
create or replace function public.enforce_publish_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('published', 'scheduled')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and not public.is_staff()
     -- The scheduled-publish cron runs with the service role, which has no
     -- auth.uid() and bypasses RLS; let it through.
     and auth.uid() is not null
  then
    raise exception 'Only administrators and editors can publish or schedule articles'
      using errcode = '42501';
  end if;

  -- Stamp published_at the first time an article actually goes live.
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists articles_publish_guard on public.articles;
create trigger articles_publish_guard before insert or update on public.articles
  for each row execute function public.enforce_publish_permission();

-- Privilege escalation guard.
--
-- Users may edit their own profile (display name, avatar), and RLS allows that
-- with `id = auth.uid()`. But RLS operates on rows, not columns — without this
-- trigger, any signed-in reader could run
--
--     update profiles set role = 'admin' where id = auth.uid();
--
-- and, because auth_role() reads profiles.role, immediately satisfy every
-- admin policy in the database. Role and byline assignment are therefore
-- immutable except to an administrator.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No auth.uid(): the service role, or a SECURITY DEFINER trigger such as
  -- handle_new_user running during signup. Both are trusted.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Everyone else: silently keep the privileged columns as they were, rather
  -- than raising. A user editing their display name shouldn't get an error
  -- because the form also round-tripped a role field.
  new.role      := old.role;
  new.author_id := old.author_id;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- ---------------------------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.categories      enable row level security;
alter table public.authors         enable row level security;
alter table public.tags            enable row level security;
alter table public.articles        enable row level security;
alter table public.article_tags    enable row level security;
alter table public.media           enable row level security;
alter table public.settings        enable row level security;
alter table public.subscribers     enable row level security;
alter table public.email_sends     enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());

-- Users can edit their own profile, but `role` and `author_id` are pinned by
-- the profiles_protect_privileges trigger above — RLS can gate rows, not
-- columns, so the trigger is what stops self-promotion to admin.
drop policy if exists "own profile updatable" on public.profiles;
create policy "own profile updatable" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_allowlist -----------------------------------------------------------
drop policy if exists "admins manage allowlist" on public.admin_allowlist;
create policy "admins manage allowlist" on public.admin_allowlist
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- categories / authors / tags: world-readable, staff-writable ---------------
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "categories staff write" on public.categories;
create policy "categories staff write" on public.categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "authors public read" on public.authors;
create policy "authors public read" on public.authors
  for select to anon, authenticated using (true);

drop policy if exists "authors staff write" on public.authors;
create policy "authors staff write" on public.authors
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "authors edit own byline" on public.authors;
create policy "authors edit own byline" on public.authors
  for update to authenticated
  using (id = (select author_id from public.profiles where id = auth.uid()))
  with check (id = (select author_id from public.profiles where id = auth.uid()));

drop policy if exists "tags public read" on public.tags;
create policy "tags public read" on public.tags
  for select to anon, authenticated using (true);

drop policy if exists "tags writer write" on public.tags;
create policy "tags writer write" on public.tags
  for all to authenticated using (public.can_write()) with check (public.can_write());

-- articles ------------------------------------------------------------------
-- The public sees published articles whose publish time has arrived. Nothing
-- else. Drafts, scheduled pieces, and archived stories are invisible.
drop policy if exists "articles public read published" on public.articles;
create policy "articles public read published" on public.articles
  for select to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

drop policy if exists "articles writers read all" on public.articles;
create policy "articles writers read all" on public.articles
  for select to authenticated using (public.can_write());

drop policy if exists "articles writers insert" on public.articles;
create policy "articles writers insert" on public.articles
  for insert to authenticated with check (public.can_write());

-- Staff can edit anything. Contributors can edit only their own work, and only
-- while it is not live.
drop policy if exists "articles staff update" on public.articles;
create policy "articles staff update" on public.articles
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "articles contributor update own" on public.articles;
create policy "articles contributor update own" on public.articles
  for update to authenticated
  using (
    public.auth_role() = 'contributor'::public.user_role
    and created_by = auth.uid()
    and status in ('draft', 'archived')
  )
  with check (
    public.auth_role() = 'contributor'::public.user_role
    and created_by = auth.uid()
  );

drop policy if exists "articles staff delete" on public.articles;
create policy "articles staff delete" on public.articles
  for delete to authenticated using (public.is_staff());

drop policy if exists "articles contributor delete own draft" on public.articles;
create policy "articles contributor delete own draft" on public.articles
  for delete to authenticated
  using (
    public.auth_role() = 'contributor'::public.user_role
    and created_by = auth.uid()
    and status = 'draft'
  );

-- article_tags --------------------------------------------------------------
drop policy if exists "article_tags public read" on public.article_tags;
create policy "article_tags public read" on public.article_tags
  for select to anon, authenticated using (true);

drop policy if exists "article_tags writer write" on public.article_tags;
create policy "article_tags writer write" on public.article_tags
  for all to authenticated using (public.can_write()) with check (public.can_write());

-- media ---------------------------------------------------------------------
drop policy if exists "media public read" on public.media;
create policy "media public read" on public.media
  for select to anon, authenticated using (true);

drop policy if exists "media writer write" on public.media;
create policy "media writer write" on public.media
  for all to authenticated using (public.can_write()) with check (public.can_write());

-- settings ------------------------------------------------------------------
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings
  for select to anon, authenticated using (true);

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- subscribers ---------------------------------------------------------------
-- No anon access at all. Signup, confirmation, and unsubscribe run through
-- server routes with the service-role key, which bypasses RLS.
drop policy if exists "subscribers staff read" on public.subscribers;
create policy "subscribers staff read" on public.subscribers
  for select to authenticated using (public.is_staff());

drop policy if exists "subscribers admin write" on public.subscribers;
create policy "subscribers admin write" on public.subscribers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- email_sends ---------------------------------------------------------------
drop policy if exists "email_sends staff read" on public.email_sends;
create policy "email_sends staff read" on public.email_sends
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 10. Storage bucket for images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media bucket public read" on storage.objects;
create policy "media bucket public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

drop policy if exists "media bucket writer upload" on storage.objects;
create policy "media bucket writer upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.can_write());

drop policy if exists "media bucket writer update" on storage.objects;
create policy "media bucket writer update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.can_write());

drop policy if exists "media bucket staff delete" on storage.objects;
create policy "media bucket staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_staff());

-- ---------------------------------------------------------------------------
-- 11. Scheduled publishing
-- ---------------------------------------------------------------------------
-- Flips any 'scheduled' article whose time has arrived to 'published'.
-- Called by /api/cron/publish-scheduled (Vercel Cron) every 5 minutes.
-- Returns the rows it published so the caller can send announcements.

create or replace function public.publish_due_articles()
returns setof public.articles
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.articles
     set status = 'published',
         published_at = coalesce(scheduled_for, now())
   where status = 'scheduled'
     and scheduled_for is not null
     and scheduled_for <= now()
  returning *;
end;
$$;

-- Readers and signed-in users must never trigger a publishing run; only the
-- cron, which authenticates as the service role.
revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;

-- ---------------------------------------------------------------------------
-- 12. Table privileges
-- ---------------------------------------------------------------------------
-- Row Level Security decides *which rows* a role may touch, but Postgres still
-- requires a table-level GRANT before the role may touch the table at all.
-- Supabase's default privileges usually cover tables created through the
-- dashboard; tables created from the SQL Editor may not inherit them, in which
-- case every query fails with "permission denied for table ...". Granting
-- explicitly makes this deterministic.
--
-- These grants are deliberately wide for `authenticated` — RLS is the real
-- gate, and that is the standard Supabase model. `anon` is the exception: it
-- is granted read access only to genuinely public content, and nothing at all
-- on profiles, the allowlist, subscribers, or the send log.

grant usage on schema public to anon, authenticated, service_role;

-- Public content, readable by anyone.
grant select on
  public.articles,
  public.authors,
  public.categories,
  public.tags,
  public.article_tags,
  public.media,
  public.settings
to anon;

-- Signed-in users. RLS narrows every one of these to what their role allows.
grant select, insert, update, delete on
  public.articles,
  public.authors,
  public.categories,
  public.tags,
  public.article_tags,
  public.media,
  public.settings,
  public.profiles,
  public.admin_allowlist,
  public.subscribers,
  public.email_sends
to authenticated;

-- The service role bypasses RLS entirely and is used only by server code.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
