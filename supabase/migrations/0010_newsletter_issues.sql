-- =============================================================================
-- 0010 — Newsletter issues: the weekly Sunday Letter
-- -----------------------------------------------------------------------------
-- Until now the only broadcast was a single-article announcement. This adds the
-- recurring issue: an editor's note, one lead story, the week's newest
-- reporting, and what readers are actually reading.
--
-- Two things are worth explaining.
--
-- 1. **Selections are stored as article ids, but a sent issue keeps a
--    `snapshot`.** While an issue is a draft it must track the live articles —
--    a headline fixed on Saturday should appear fixed in Sunday's letter. Once
--    it ships, the opposite is true: the archive page has to show what
--    subscribers actually received, forever, even if an article is later
--    retitled, unpublished, or deleted. So the send writes a JSONB copy of
--    exactly what went out, and the public page renders that.
--
-- 2. **`issue_number` is assigned by a trigger, not the app.** Two editors
--    starting an issue at the same moment would otherwise race to the same
--    number. The trigger takes it inside the transaction.
--
-- Additive. One enum, one table. No existing row is modified.
-- Run it in Supabase Dashboard → SQL Editor.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'newsletter_status') then
    create type public.newsletter_status as enum ('draft', 'sent');
  end if;
end
$$;

create table if not exists public.newsletter_issues (
  id            uuid primary key default gen_random_uuid(),
  -- Assigned by the trigger below. Unique, gapless in practice, and shown to
  -- readers as "Issue No. 12".
  issue_number  int  not null,
  slug          text not null,
  title         text not null,
  -- Preheader in the inbox and the blurb in the archive listing.
  summary       text not null default '',
  -- The editor's note at the top. Plain text; blank lines split paragraphs.
  intro         text not null default '',
  status        public.newsletter_status not null default 'draft',

  -- Selections. Ordinary uuid[] rather than a join table: the order the editor
  -- chose is the order that ships, and an array preserves it for free.
  lead_article_id uuid references public.articles (id) on delete set null,
  latest_ids      uuid[] not null default '{}',
  trending_ids    uuid[] not null default '{}',

  -- What actually shipped. Null until sent. See note 1 above.
  snapshot      jsonb,

  sent_at       timestamptz,
  recipients    int not null default 0,
  succeeded     int not null default 0,
  failed        int not null default 0,

  created_by    uuid references public.profiles (id) on delete set null,
  sent_by       uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.newsletter_issues is
  'Weekly newsletter issues. Drafts track live articles; sent issues render from their snapshot.';

create unique index if not exists newsletter_issues_number_idx
  on public.newsletter_issues (issue_number);

create unique index if not exists newsletter_issues_slug_idx
  on public.newsletter_issues (slug);

-- The archive lists sent issues newest-first; that is the only public read.
create index if not exists newsletter_issues_sent_idx
  on public.newsletter_issues (sent_at desc)
  where status = 'sent';

-- --- Issue numbering ---------------------------------------------------------

/**
 * Takes the next issue number inside the inserting transaction, so two editors
 * composing at once cannot collide. Left alone if the caller supplied one
 * (useful when importing a back catalogue).
 */
create or replace function public.assign_issue_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.issue_number is null or new.issue_number = 0 then
    -- Locks the table against concurrent inserts only, which is exactly the
    -- window that matters; issues are created a handful of times a year.
    lock table public.newsletter_issues in share row exclusive mode;
    select coalesce(max(issue_number), 0) + 1
      into new.issue_number
      from public.newsletter_issues;
  end if;
  return new;
end;
$$;

drop trigger if exists newsletter_issues_number on public.newsletter_issues;
create trigger newsletter_issues_number
  before insert on public.newsletter_issues
  for each row execute function public.assign_issue_number();

drop trigger if exists newsletter_issues_touch on public.newsletter_issues;
create trigger newsletter_issues_touch
  before update on public.newsletter_issues
  for each row execute function public.touch_updated_at();

-- --- Row level security ------------------------------------------------------

alter table public.newsletter_issues enable row level security;

-- Readers see sent issues and nothing else. A draft is newsroom-internal until
-- the moment it ships.
drop policy if exists "newsletter_issues public read" on public.newsletter_issues;
create policy "newsletter_issues public read" on public.newsletter_issues
  for select to anon, authenticated using (status = 'sent');

drop policy if exists "newsletter_issues staff read" on public.newsletter_issues;
create policy "newsletter_issues staff read" on public.newsletter_issues
  for select to authenticated using (public.is_staff());

drop policy if exists "newsletter_issues staff write" on public.newsletter_issues;
create policy "newsletter_issues staff write" on public.newsletter_issues
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- Grants ------------------------------------------------------------------
-- RLS decides which rows; these decide whether the table is reachable at all.
-- See 0004 for why both are needed.

grant select on public.newsletter_issues to anon;
grant select, insert, update, delete on public.newsletter_issues to authenticated;
grant all on public.newsletter_issues to service_role;

-- --- Audit link --------------------------------------------------------------
-- `email_sends` already logs every blast. Point its rows at the issue that
-- produced them so /admin/subscribers can tell a weekly letter apart from a
-- one-off article announcement.

alter table public.email_sends
  add column if not exists newsletter_issue_id uuid
  references public.newsletter_issues (id) on delete set null;

comment on column public.email_sends.newsletter_issue_id is
  'Set when the send was a newsletter issue rather than a single-article announcement.';

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   insert into public.newsletter_issues (slug, title) values ('test', 'Test');
--   select issue_number, slug, status from public.newsletter_issues;
--   delete from public.newsletter_issues where slug = 'test';
