-- =============================================================================
-- 0005 — Article view counts
-- -----------------------------------------------------------------------------
-- `articles.view_count` has existed since 0001 but nothing ever wrote to it.
-- This adds the one piece that was missing: a way for an anonymous reader to
-- increment the counter for a single published article, and nothing else.
--
-- Safe to run on a database with live data. It creates a function and grants;
-- it does not alter, move, or delete any existing row.
--
-- Run it in Supabase Dashboard → SQL Editor, same as the earlier migrations.
-- =============================================================================

-- Why a function instead of letting the site UPDATE the row directly:
-- granting anon UPDATE on `articles` would let anyone rewrite headlines. This
-- runs as its own owner (security definer), touches exactly one column, and
-- only for articles that are already published — so the widest possible abuse
-- is inflating a number on a story the public can already read.
create or replace function public.increment_article_view(article_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update public.articles
     set view_count = view_count + 1
   where slug = article_slug
     and status = 'published'
  returning view_count into new_count;

  -- Unknown or unpublished slug: report nothing rather than raising, so a
  -- stale link from a cached page can't produce a 500.
  return new_count;
end;
$$;

comment on function public.increment_article_view(text) is
  'Adds one view to a published article. Callable by anonymous readers; cannot modify anything else.';

-- The function is the only granted surface. `articles` itself keeps whatever
-- privileges 0004 established.
revoke all on function public.increment_article_view(text) from public;
grant execute on function public.increment_article_view(text) to anon, authenticated;
