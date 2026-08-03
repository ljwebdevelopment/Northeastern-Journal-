-- =============================================================================
-- 0010 — Editorial workflow: review queue, revisions, preview links
-- -----------------------------------------------------------------------------
-- Three gaps this closes:
--
--   1. Review    — a contributor can hand a piece to the desk, an editor can
--                  approve it or send it back with a note. `editorial_notes`
--                  is the conversation; 0011's 'in_review' status is the state.
--   2. Revisions — every save snapshots the body, so a closed tab, a bad paste,
--                  or a disagreement about an edit is recoverable.
--   3. Preview   — an unguessable token per article, so a draft can be read
--                  (and shared with a source or a subeditor) before it is live.
--
-- Run 0011 first — this file compares against the 'in_review' enum value.
--
-- Additive. Creates two tables and one column; no existing row is modified.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Editorial notes
-- ---------------------------------------------------------------------------
-- The thread attached to an article. `kind` records what the note *did*, so
-- the review history reads as a timeline rather than a pile of comments.

do $$ begin
  create type public.editorial_note_kind as enum (
    'comment',            -- a remark, no state change
    'submitted',          -- writer sent it to the desk
    'changes_requested',  -- editor sent it back
    'approved'            -- editor accepted it (publishing is a separate act)
  );
exception when duplicate_object then null; end $$;

create table if not exists public.editorial_notes (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id)  on delete cascade,
  author_id   uuid          references public.profiles (id) on delete set null,
  kind        public.editorial_note_kind not null default 'comment',
  body        text not null default '',
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.editorial_notes is
  'Review conversation for an article: submissions, change requests, approvals, and plain comments.';

create index if not exists editorial_notes_article_idx
  on public.editorial_notes (article_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Revisions
-- ---------------------------------------------------------------------------
-- A snapshot of the editable body. Deliberately not a full row copy: metadata
-- (tags, flags, schedule) is cheap to redo and expensive to restore wrongly,
-- whereas losing prose is the failure that actually hurts.

do $$ begin
  create type public.revision_kind as enum ('autosave', 'manual', 'publish');
exception when duplicate_object then null; end $$;

create table if not exists public.article_revisions (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references public.articles (id)  on delete cascade,
  created_by    uuid          references public.profiles (id) on delete set null,
  kind          public.revision_kind not null default 'manual',
  title         text not null default '',
  subtitle      text,
  excerpt       text not null default '',
  body_html     text not null default '',
  body_markdown text,
  word_count    int  not null default 0,
  created_at    timestamptz not null default now()
);

comment on table public.article_revisions is
  'Point-in-time snapshots of an article body. Autosaves are pruned; manual and publish snapshots are kept.';

create index if not exists article_revisions_article_idx
  on public.article_revisions (article_id, created_at desc);

-- Autosaves accumulate fast — one every half minute while someone is typing.
-- Keep the twenty most recent per article and drop the rest. Manual and
-- publish snapshots are never pruned: those are the ones a person chose.
create or replace function public.prune_autosave_revisions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.article_revisions
   where id in (
     select id
       from public.article_revisions
      where article_id = new.article_id
        and kind = 'autosave'
      order by created_at desc
      offset 20
   );
  return null;
end;
$$;

drop trigger if exists article_revisions_prune on public.article_revisions;
create trigger article_revisions_prune after insert on public.article_revisions
  for each row when (new.kind = 'autosave')
  execute function public.prune_autosave_revisions();

-- ---------------------------------------------------------------------------
-- 3. Preview tokens
-- ---------------------------------------------------------------------------
-- Random per article, so possessing a link to one draft tells you nothing
-- about any other. The preview route reads it with the service role; `anon`
-- gets no new access to the articles table.

alter table public.articles
  add column if not exists preview_token uuid not null default gen_random_uuid();

create unique index if not exists articles_preview_token_idx
  on public.articles (preview_token);

comment on column public.articles.preview_token is
  'Unguessable id for /preview/<token>. Rotate it to revoke every shared link at once.';

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.editorial_notes   enable row level security;
alter table public.article_revisions enable row level security;

-- Notes: staff see every thread. A contributor sees only the threads on their
-- own pieces — which is the point of the feature, so they read the feedback.
drop policy if exists "editorial notes readable" on public.editorial_notes;
create policy "editorial notes readable" on public.editorial_notes
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.articles a
       where a.id = editorial_notes.article_id
         and a.created_by = auth.uid()
    )
  );

drop policy if exists "editorial notes writable" on public.editorial_notes;
create policy "editorial notes writable" on public.editorial_notes
  for insert to authenticated
  with check (
    public.can_write()
    and (
      public.is_staff()
      or exists (
        select 1 from public.articles a
         where a.id = editorial_notes.article_id
           and a.created_by = auth.uid()
      )
    )
  );

-- Resolving a note is an editor's call.
drop policy if exists "editorial notes staff update" on public.editorial_notes;
create policy "editorial notes staff update" on public.editorial_notes
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "editorial notes staff delete" on public.editorial_notes;
create policy "editorial notes staff delete" on public.editorial_notes
  for delete to authenticated using (public.is_staff());

-- Revisions follow the same shape as notes.
drop policy if exists "revisions readable" on public.article_revisions;
create policy "revisions readable" on public.article_revisions
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.articles a
       where a.id = article_revisions.article_id
         and a.created_by = auth.uid()
    )
  );

drop policy if exists "revisions writable" on public.article_revisions;
create policy "revisions writable" on public.article_revisions
  for insert to authenticated with check (public.can_write());

drop policy if exists "revisions staff delete" on public.article_revisions;
create policy "revisions staff delete" on public.article_revisions
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 5. Let contributors move their own work into review
-- ---------------------------------------------------------------------------
-- The original policy allowed a contributor to touch their article only while
-- it was 'draft' or 'archived'. Submitting for review moves it to 'in_review',
-- which would then have locked them out of their own piece — including out of
-- withdrawing it again. Both states are now editable by the writer.
--
-- The WITH CHECK is new: it pins the set of statuses a contributor may write.
-- 'published' and 'scheduled' were already blocked by the publish trigger, so
-- this is belt and braces, and it keeps the rule visible in one place.

drop policy if exists "articles contributor update own" on public.articles;
create policy "articles contributor update own" on public.articles
  for update to authenticated
  using (
    public.auth_role() = 'contributor'::public.user_role
    and created_by = auth.uid()
    and status in ('draft', 'in_review', 'archived')
  )
  with check (
    public.auth_role() = 'contributor'::public.user_role
    and created_by = auth.uid()
    and status in ('draft', 'in_review', 'archived')
  );

-- ---------------------------------------------------------------------------
-- 6. Table privileges
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.editorial_notes   to authenticated;
grant select, insert, delete         on public.article_revisions to authenticated;
