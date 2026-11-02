-- =============================================================================
-- 0018 — Co-authored articles and tagged ("featuring") contributors
-- -----------------------------------------------------------------------------
-- Two additions to the byline:
--
--   • article_coauthors — further bylines on an article, after the lead author
--     in `articles.author_id`. A column written by two people lists both.
--   • article_mentions  — contributors tagged on an article without being an
--     author: shown as "Featuring …" under the piece and on their profile.
--
-- The lead stays in `articles.author_id`, so every existing query, feed, and
-- email keeps working unchanged; co-authors are purely additive.
--
-- Editing. Until now a contributor could edit only articles they created.
-- A co-written piece has to be editable by everyone on its byline, so a
-- contributor may now also edit a draft when their linked byline is its lead
-- author or a co-author. The rules are otherwise unchanged: contributors still
-- cannot touch live pieces, and publishing remains staff-only (enforced by the
-- articles_publish_guard trigger, which this does not alter).
--
-- Only someone who can already edit an article may change its co-authors or
-- tags, so nobody can add themselves to another writer's piece.
--
-- Additive and safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.article_coauthors (
  article_id uuid     not null references public.articles (id) on delete cascade,
  author_id  uuid     not null references public.authors (id)  on delete cascade,
  -- Byline order after the lead author: 1 is listed second, and so on.
  position   smallint not null default 1,
  primary key (article_id, author_id)
);

create index if not exists article_coauthors_author_idx
  on public.article_coauthors (author_id);

create table if not exists public.article_mentions (
  article_id uuid     not null references public.articles (id) on delete cascade,
  author_id  uuid     not null references public.authors (id)  on delete cascade,
  position   smallint not null default 1,
  primary key (article_id, author_id)
);

create index if not exists article_mentions_author_idx
  on public.article_mentions (author_id);

comment on table public.article_coauthors is
  'Bylines after the lead author (articles.author_id). Co-authors may edit the draft.';
comment on table public.article_mentions is
  'Contributors tagged on an article ("Featuring"). Display only; grants no editing rights.';

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so the policies below can look at articles and co-authors
-- without recursing through those tables' own RLS.

-- The byline linked to the signed-in user, if any.
create or replace function public.my_author_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select author_id from public.profiles where id = auth.uid();
$$;

-- True when the signed-in user created the article or is on its byline.
create or replace function public.is_article_collaborator(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.articles a
     where a.id = target
       and (
         a.created_by = auth.uid()
         or (a.author_id is not null and a.author_id = public.my_author_id())
         or exists (
           select 1 from public.article_coauthors c
            where c.article_id = a.id
              and c.author_id = public.my_author_id()
         )
       )
  );
$$;

-- Who may change an article's co-authors and tags: staff always; contributors
-- on their own pieces while those are not live — the same window in which they
-- may edit the article itself.
create or replace function public.can_edit_article(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
      or (
        public.auth_role() = 'contributor'::public.user_role
        and public.is_article_collaborator(target)
        and exists (
          select 1 from public.articles a
           where a.id = target
             and a.status in ('draft', 'in_review', 'archived')
        )
      );
$$;

revoke execute on function public.my_author_id()                from public, anon;
revoke execute on function public.is_article_collaborator(uuid) from public, anon;
revoke execute on function public.can_edit_article(uuid)        from public, anon;
grant  execute on function public.my_author_id()                to authenticated;
grant  execute on function public.is_article_collaborator(uuid) to authenticated;
grant  execute on function public.can_edit_article(uuid)        to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.article_coauthors enable row level security;
alter table public.article_mentions  enable row level security;

-- Readable wherever the article itself is: the subquery runs under the
-- reader's own RLS on `articles`, so the public sees rows for published
-- pieces only, and newsroom accounts see everything.
drop policy if exists "article_coauthors readable" on public.article_coauthors;
create policy "article_coauthors readable" on public.article_coauthors
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_coauthors.article_id));

drop policy if exists "article_coauthors editable" on public.article_coauthors;
create policy "article_coauthors editable" on public.article_coauthors
  for all to authenticated
  using (public.can_edit_article(article_id))
  with check (public.can_edit_article(article_id));

drop policy if exists "article_mentions readable" on public.article_mentions;
create policy "article_mentions readable" on public.article_mentions
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_mentions.article_id));

drop policy if exists "article_mentions editable" on public.article_mentions;
create policy "article_mentions editable" on public.article_mentions
  for all to authenticated
  using (public.can_edit_article(article_id))
  with check (public.can_edit_article(article_id));

-- Contributors on the byline may edit the draft. Permissive, so it adds to
-- "articles contributor update own" (creator) rather than replacing it.
drop policy if exists "articles contributor update byline" on public.articles;
create policy "articles contributor update byline" on public.articles
  for update to authenticated
  using (
    public.auth_role() = 'contributor'::public.user_role
    and status in ('draft', 'in_review', 'archived')
    and public.is_article_collaborator(id)
  )
  with check (
    public.auth_role() = 'contributor'::public.user_role
    and status in ('draft', 'in_review', 'archived')
    and (
      created_by = auth.uid()
      or (author_id is not null and author_id = public.my_author_id())
      or exists (
        select 1 from public.article_coauthors c
         where c.article_id = articles.id
           and c.author_id = public.my_author_id()
      )
    )
  );

-- Co-authors read and join the editorial thread and revision history, the
-- same as the article's creator.
drop policy if exists "editorial notes readable by byline" on public.editorial_notes;
create policy "editorial notes readable by byline" on public.editorial_notes
  for select to authenticated
  using (public.is_article_collaborator(article_id));

drop policy if exists "editorial notes writable by byline" on public.editorial_notes;
create policy "editorial notes writable by byline" on public.editorial_notes
  for insert to authenticated
  with check (public.can_write() and public.is_article_collaborator(article_id));

drop policy if exists "revisions readable by byline" on public.article_revisions;
create policy "revisions readable by byline" on public.article_revisions
  for select to authenticated
  using (public.is_article_collaborator(article_id));

-- ---------------------------------------------------------------------------
-- 4. Table privileges
-- ---------------------------------------------------------------------------

grant select                         on public.article_coauthors to anon, authenticated;
grant select                         on public.article_mentions  to anon, authenticated;
grant insert, update, delete         on public.article_coauthors to authenticated;
grant insert, update, delete         on public.article_mentions  to authenticated;
grant all                            on public.article_coauthors to service_role;
grant all                            on public.article_mentions  to service_role;
