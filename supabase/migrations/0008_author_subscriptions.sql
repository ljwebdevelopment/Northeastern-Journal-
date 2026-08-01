-- =============================================================================
-- 0008 — Per-journalist subscriptions
-- -----------------------------------------------------------------------------
-- Readers can follow an individual writer from their profile, the way they
-- follow someone on Substack, instead of only subscribing to the paper as a
-- whole. One reader may follow several journalists.
--
-- Following also subscribes: a follow row is meaningless if the address isn't
-- on the list, so the signup path sets both.
--
-- Additive. Creates one table and two functions; no existing row is touched.
-- =============================================================================

create table if not exists public.subscriber_authors (
  subscriber_id uuid not null references public.subscribers (id) on delete cascade,
  author_id     uuid not null references public.authors (id)     on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (subscriber_id, author_id)
);

comment on table public.subscriber_authors is
  'Which journalists a subscriber follows. Deleting either side removes the link.';

-- Counting a journalist's followers reads this by author.
create index if not exists subscriber_authors_author_idx
  on public.subscriber_authors (author_id);

alter table public.subscriber_authors enable row level security;

-- The subscriber list is private. `anon` gets no access to this table at all;
-- the public count comes from the function below, which returns a number and
-- never a row. Staff can read it for the dashboard.
drop policy if exists "subscriber_authors staff read" on public.subscriber_authors;
create policy "subscriber_authors staff read" on public.subscriber_authors
  for select to authenticated using (public.is_staff());

-- --- Public follower count ---------------------------------------------------
-- Security definer so an anonymous reader can see "132 subscribers" without
-- being able to read who they are. Only confirmed subscribers count, so an
-- unsubscribe drops the number without deleting the history.

create or replace function public.author_subscriber_count(author_slug text)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
    from public.subscriber_authors sa
    join public.authors     a on a.id = sa.author_id
    join public.subscribers s on s.id = sa.subscriber_id
   where a.slug = author_slug
     and s.status = 'confirmed';
$$;

comment on function public.author_subscriber_count(text) is
  'How many confirmed subscribers follow this author. Exposes a count only.';

revoke all on function public.author_subscriber_count(text) from public;
grant execute on function public.author_subscriber_count(text) to anon, authenticated;

-- --- Counts for the whole roster --------------------------------------------
-- One round trip for the dashboard and the contributors index.

create or replace function public.author_subscriber_counts()
returns table (author_slug text, subscribers integer)
language sql
security definer
set search_path = public
stable
as $$
  select a.slug,
         count(s.id) filter (where s.status = 'confirmed')::int
    from public.authors a
    left join public.subscriber_authors sa on sa.author_id = a.id
    left join public.subscribers        s  on s.id = sa.subscriber_id
   group by a.slug;
$$;

revoke all on function public.author_subscriber_counts() from public;
grant execute on function public.author_subscriber_counts() to anon, authenticated;
