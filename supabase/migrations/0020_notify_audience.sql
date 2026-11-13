-- =============================================================================
-- 0020 — Who an article announcement goes to
-- -----------------------------------------------------------------------------
-- "Notify subscribers" can now go to one of two audiences:
--
--   author — readers who follow the lead author or a co-author (the default)
--   all    — every confirmed subscriber, for pieces the whole list should see
--
-- The scheduled-publish cron reads this, so the choice has to live on the row
-- rather than only in the form.
--
-- Additive. Existing rows take the default.
-- =============================================================================

alter table public.articles
  add column if not exists notify_audience text not null default 'author';

alter table public.articles
  drop constraint if exists articles_notify_audience_check;
alter table public.articles
  add constraint articles_notify_audience_check
  check (notify_audience in ('author', 'all'));

comment on column public.articles.notify_audience is
  'Announcement audience: ''author'' (byline followers) or ''all'' (every confirmed subscriber).';
