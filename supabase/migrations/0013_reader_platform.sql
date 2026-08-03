-- =============================================================================
-- 0011 — Reader platform: real search, letters, preferences, daily read stats
-- -----------------------------------------------------------------------------
-- Four things the public side was missing:
--
--   1. Search that ranks. It was a substring scan over every article held in
--      memory — no ranking, no stemming, and linear in the size of the archive.
--   2. A way for readers to write back. Letters to the editor, moderated.
--   3. Subscription that isn't all-or-nothing: follow a section, choose how
--      often you hear from us.
--   4. Read counts with a date on them, so the newsroom can see a trend
--      instead of a single lifetime total.
--
-- Additive. No existing row is modified; the one column added to `subscribers`
-- defaults to the behaviour they already have.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Full-text search
-- ---------------------------------------------------------------------------
-- A stored generated column, so it can never drift from the article: Postgres
-- recomputes it inside the same statement that changes the text.
--
-- Weights let the ranker prefer a headline match over a passing mention:
--   A title · B subtitle and summary · D body
--
-- The body is HTML, and `to_tsvector` on raw markup would index every tag name.
-- Stripping tags with a regex is crude for parsing HTML in general but exact
-- for this job — the editor writes through a sanitizer, so the markup is a
-- known, small, well-formed subset.

alter table public.articles
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),    'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')),  'B') ||
    setweight(
      to_tsvector('english', regexp_replace(coalesce(body_html, ''), '<[^>]*>', ' ', 'g')),
      'D'
    )
  ) stored;

comment on column public.articles.search_vector is
  'Weighted lexemes for site search. Maintained by Postgres; never write to it.';

create index if not exists articles_search_vector_idx
  on public.articles using gin (search_vector);

-- The 0001 index covered an expression over title+excerpt that nothing queried.
-- The generated column replaces it.
drop index if exists public.articles_search_idx;

-- ---------------------------------------------------------------------------
-- 2. Letters to the editor
-- ---------------------------------------------------------------------------
-- Readers submit anonymously through a server route (service role), the desk
-- moderates, and approved letters can be shown publicly. The email address is
-- never public: `letters_public` exposes only what belongs in print.

do $$ begin
  create type public.letter_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.letters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  location     text,
  subject      text not null default '',
  body         text not null,

  -- Optional: the piece being responded to.
  article_id   uuid references public.articles (id) on delete set null,

  status       public.letter_status not null default 'pending',
  moderated_by uuid references public.profiles (id) on delete set null,
  moderated_at timestamptz,
  editor_note  text,

  -- Consent + abuse evidence, same as the subscriber table keeps.
  consent_ip         text,
  consent_user_agent text,

  created_at   timestamptz not null default now()
);

comment on table public.letters is
  'Reader letters to the editor. Rows are private; approved letters are exposed through letters_public.';

create index if not exists letters_status_idx  on public.letters (status, created_at desc);
create index if not exists letters_article_idx on public.letters (article_id);

-- What the public may see: no address, no IP, no moderation trail.
create or replace view public.letters_public
with (security_invoker = false) as
  select id, name, location, subject, body, article_id, created_at
    from public.letters
   where status = 'approved';

comment on view public.letters_public is
  'Approved letters, minus the personal data. security_invoker = false so anon can read it without any grant on letters itself.';

alter table public.letters enable row level security;

-- No anon policy at all: submissions arrive through the service role, exactly
-- as newsletter signups do, so an anonymous visitor can write a row they can
-- never read back.
drop policy if exists "letters staff read" on public.letters;
create policy "letters staff read" on public.letters
  for select to authenticated using (public.is_staff());

drop policy if exists "letters staff moderate" on public.letters;
create policy "letters staff moderate" on public.letters
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "letters admin delete" on public.letters;
create policy "letters admin delete" on public.letters
  for delete to authenticated using (public.is_admin());

grant select, update, delete on public.letters to authenticated;
grant select on public.letters_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Subscription preferences
-- ---------------------------------------------------------------------------
-- 'immediate' is what every existing subscriber gets today, so the default
-- makes this migration a no-op for them.

alter table public.subscribers
  add column if not exists frequency text not null default 'immediate'
  check (frequency in ('immediate', 'daily', 'weekly'));

comment on column public.subscribers.frequency is
  'How often this reader wants email. Digest modes are honoured by the announcement sender.';

create table if not exists public.subscriber_categories (
  subscriber_id uuid not null references public.subscribers (id) on delete cascade,
  category_id   uuid not null references public.categories (id)  on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (subscriber_id, category_id)
);

comment on table public.subscriber_categories is
  'Sections a reader follows. An empty set means everything — nobody is opted out by having no rows.';

create index if not exists subscriber_categories_category_idx
  on public.subscriber_categories (category_id);

alter table public.subscriber_categories enable row level security;

drop policy if exists "subscriber_categories staff read" on public.subscriber_categories;
create policy "subscriber_categories staff read" on public.subscriber_categories
  for select to authenticated using (public.is_staff());

grant select on public.subscriber_categories to authenticated;

-- --- Reading and writing preferences by token --------------------------------
-- The preferences page is reached from a link in an email, with no sign-in —
-- same principle as one-click unsubscribe. The unsubscribe token is the key.

create or replace function public.subscriber_preferences(token uuid)
returns table (
  email          text,
  name           text,
  status         public.subscriber_status,
  frequency      text,
  category_slugs text[],
  author_slugs   text[]
)
language sql
security definer
set search_path = public
stable
as $$
  select s.email,
         s.name,
         s.status,
         s.frequency,
         coalesce(
           (select array_agg(c.slug order by c.sort_order)
              from public.subscriber_categories sc
              join public.categories c on c.id = sc.category_id
             where sc.subscriber_id = s.id),
           '{}'::text[]
         ),
         coalesce(
           (select array_agg(a.slug order by a.name)
              from public.subscriber_authors sa
              join public.authors a on a.id = sa.author_id
             where sa.subscriber_id = s.id),
           '{}'::text[]
         )
    from public.subscribers s
   where s.unsubscribe_token = token;
$$;

comment on function public.subscriber_preferences(uuid) is
  'Everything the preferences page shows, addressed by unsubscribe token. Returns no row for an unknown token.';

-- Writes are the mirror image. Passing null for an array leaves it untouched,
-- so the page can save one section of the form without clearing the others.
create or replace function public.save_subscriber_preferences(
  token          uuid,
  new_frequency  text default null,
  category_slugs text[] default null,
  author_slugs   text[] default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  sub_id uuid;
begin
  select id into sub_id from public.subscribers where unsubscribe_token = token;
  if sub_id is null then
    return false;
  end if;

  if new_frequency is not null then
    if new_frequency not in ('immediate', 'daily', 'weekly') then
      raise exception 'Unknown frequency %', new_frequency using errcode = '22023';
    end if;
    update public.subscribers set frequency = new_frequency where id = sub_id;
  end if;

  if category_slugs is not null then
    delete from public.subscriber_categories where subscriber_id = sub_id;
    insert into public.subscriber_categories (subscriber_id, category_id)
    select sub_id, c.id from public.categories c where c.slug = any(category_slugs);
  end if;

  if author_slugs is not null then
    delete from public.subscriber_authors where subscriber_id = sub_id;
    insert into public.subscriber_authors (subscriber_id, author_id)
    select sub_id, a.id from public.authors a where a.slug = any(author_slugs);
  end if;

  return true;
end;
$$;

-- Both are reachable without a session, by token only. That is the same trust
-- model as the unsubscribe link, and the token is a random uuid.
revoke all on function public.subscriber_preferences(uuid) from public;
revoke all on function public.save_subscriber_preferences(uuid, text, text[], text[]) from public;
grant execute on function public.subscriber_preferences(uuid) to anon, authenticated;
grant execute on function public.save_subscriber_preferences(uuid, text, text[], text[])
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Daily read counts
-- ---------------------------------------------------------------------------
-- `articles.view_count` is a lifetime total and answers nothing about whether
-- a story is being read *now*. One row per article per day is small, bounded,
-- and enough for every chart the newsroom needs.

create table if not exists public.article_views_daily (
  article_id uuid not null references public.articles (id) on delete cascade,
  day        date not null default current_date,
  views      bigint not null default 0,
  primary key (article_id, day)
);

comment on table public.article_views_daily is
  'Reads per article per day. Written only by increment_article_view.';

create index if not exists article_views_daily_day_idx
  on public.article_views_daily (day desc);

alter table public.article_views_daily enable row level security;

drop policy if exists "daily views staff read" on public.article_views_daily;
create policy "daily views staff read" on public.article_views_daily
  for select to authenticated using (public.can_write());

grant select on public.article_views_daily to authenticated;

-- Replaces the 0005 version: same guarantees (one column, published articles
-- only, no error on an unknown slug), now also stamping the day.
create or replace function public.increment_article_view(article_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  hit_id    uuid;
  new_count bigint;
begin
  update public.articles
     set view_count = view_count + 1
   where slug = article_slug
     and status = 'published'
  returning id, view_count into hit_id, new_count;

  if hit_id is null then
    return null;
  end if;

  insert into public.article_views_daily (article_id, day, views)
       values (hit_id, current_date, 1)
  on conflict (article_id, day) do update
     set views = public.article_views_daily.views + 1;

  return new_count;
end;
$$;

revoke all on function public.increment_article_view(text) from public;
grant execute on function public.increment_article_view(text) to anon, authenticated;

-- --- Newsroom summary --------------------------------------------------------
-- One call for the analytics screen: reads per day across the whole site.

create or replace function public.daily_reads(days int default 30)
returns table (day date, views bigint)
language sql
security definer
set search_path = public
stable
as $$
  select d::date, coalesce(sum(v.views), 0)::bigint
    from generate_series(current_date - (days - 1), current_date, interval '1 day') d
    left join public.article_views_daily v on v.day = d::date
   where public.can_write()
   group by d
   order by d;
$$;

-- Security definer, so gate it on being newsroom staff rather than merely
-- signed in — a 'reader' account has no business reading traffic figures.
create or replace function public.top_articles(days int default 7, limit_count int default 10)
returns table (article_id uuid, title text, slug text, category_slug text, views bigint)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.title, a.slug, c.slug, sum(v.views)::bigint
    from public.article_views_daily v
    join public.articles a on a.id = v.article_id
    left join public.categories c on c.id = a.category_id
   where v.day >= current_date - (days - 1)
     and public.can_write()
   group by a.id, a.title, a.slug, c.slug
   order by 5 desc
   limit limit_count;
$$;

revoke all on function public.daily_reads(int)       from public, anon;
revoke all on function public.top_articles(int, int) from public, anon;
grant execute on function public.daily_reads(int)       to authenticated;
grant execute on function public.top_articles(int, int) to authenticated;
