-- =============================================================================
-- 0009 — Article engagement: likes and reader comments
-- -----------------------------------------------------------------------------
-- Two reader-facing features on article pages:
--
--   * a like count, toggled from the browser, stored on the article row
--   * anonymous reader comments, with one level of replies
--
-- Both are written by people who are not signed in, so both follow the pattern
-- established by 0005: the anon key gets no direct write access to any table.
-- Every write goes through a security-definer function that touches exactly
-- what it needs to and refuses anything on an unpublished article.
--
-- Comment reads also go through a function rather than a table grant, because
-- `delete_token` must never reach the browser of anyone except the person who
-- wrote the comment. A row-level policy cannot hide a single column, so the
-- read surface is a function that simply does not select it.
--
-- Additive. Adds one column and one table, plus functions. No existing row is
-- modified. Run it in Supabase Dashboard → SQL Editor.
-- =============================================================================

-- --- Likes -------------------------------------------------------------------

alter table public.articles
  add column if not exists like_count bigint not null default 0;

comment on column public.articles.like_count is
  'Reader likes. Written only by set_article_like().';

/**
 * Applies one like or un-like to a published article and returns the new
 * total. `liked` false decrements, floored at zero so a replayed un-like can
 * never drive the count negative.
 *
 * Who is liking is deliberately not recorded. There are no reader accounts,
 * so the only available identifier would be an IP address, and storing one
 * per like would turn a vanity counter into a log of who read what. The API
 * route in front of this dedupes with a per-article cookie instead.
 */
create or replace function public.set_article_like(article_slug text, liked boolean)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update public.articles
     set like_count = greatest(0, like_count + case when liked then 1 else -1 end)
   where slug = article_slug
     and status = 'published'
  returning like_count into new_count;

  -- Unknown or unpublished slug: report nothing rather than raising, so a
  -- stale link from a cached page can't produce a 500.
  return new_count;
end;
$$;

comment on function public.set_article_like(text, boolean) is
  'Adds or removes one like on a published article. Callable anonymously; cannot modify anything else.';

revoke all on function public.set_article_like(text, boolean) from public;
grant execute on function public.set_article_like(text, boolean) to anon, authenticated;

-- --- Comments ----------------------------------------------------------------

create table if not exists public.article_comments (
  id           uuid primary key default gen_random_uuid(),
  article_id   uuid not null references public.articles (id) on delete cascade,
  -- One level of replies only; enforced in add_article_comment().
  parent_id    uuid references public.article_comments (id) on delete cascade,
  author_name  text not null,
  body         text not null,
  -- Handed to the author once, on creation, and kept in their browser. It is
  -- the only thing that lets them delete their own comment later.
  delete_token uuid not null default gen_random_uuid(),
  -- Soft delete. The row stays so replies to it keep their place in the
  -- thread; the text is replaced with a placeholder on read.
  deleted_at   timestamptz,
  -- Set by staff for a takedown. Hidden comments disappear entirely.
  hidden_at    timestamptz,
  created_at   timestamptz not null default now(),
  -- Abuse forensics only. Never returned by the public read function.
  author_ip         text,
  author_user_agent text
);

comment on table public.article_comments is
  'Anonymous reader comments. Public reads go through get_article_comments(), which omits delete_token and the request metadata.';

-- The thread for one article, oldest first, is the only read pattern.
create index if not exists article_comments_article_idx
  on public.article_comments (article_id, created_at);

create index if not exists article_comments_parent_idx
  on public.article_comments (parent_id);

alter table public.article_comments enable row level security;

-- No anon policy at all. Readers reach this table exclusively through the
-- functions below, which is what keeps delete_token and IPs out of reach.
-- Staff can read everything for moderation, and delete for takedowns.
drop policy if exists "article_comments staff read" on public.article_comments;
create policy "article_comments staff read" on public.article_comments
  for select to authenticated using (public.is_staff());

drop policy if exists "article_comments staff write" on public.article_comments;
create policy "article_comments staff write" on public.article_comments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "article_comments staff delete" on public.article_comments;
create policy "article_comments staff delete" on public.article_comments
  for delete to authenticated using (public.is_staff());

/**
 * The public thread for one article, oldest first.
 *
 * Returns only what the page renders. `delete_token`, `author_ip`, and
 * `author_user_agent` are never selected, so no amount of poking at the API
 * surfaces them. Soft-deleted comments come back as a placeholder rather than
 * vanishing, so replies underneath them still make sense; staff-hidden ones
 * are dropped outright.
 */
create or replace function public.get_article_comments(article_slug text)
returns table (
  id          uuid,
  parent_id   uuid,
  author_name text,
  body        text,
  is_deleted  boolean,
  created_at  timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id,
         c.parent_id,
         case when c.deleted_at is null then c.author_name else '[removed]' end,
         case when c.deleted_at is null then c.body        else 'This comment was removed by its author.' end,
         c.deleted_at is not null,
         c.created_at
    from public.article_comments c
    join public.articles a on a.id = c.article_id
   where a.slug = article_slug
     and a.status = 'published'
     and c.hidden_at is null
   order by c.created_at asc;
$$;

comment on function public.get_article_comments(text) is
  'Public comment thread for a published article. Never returns delete_token or request metadata.';

revoke all on function public.get_article_comments(text) from public;
grant execute on function public.get_article_comments(text) to anon, authenticated;

/**
 * Posts a comment and returns it, including the delete token — the one moment
 * that token is ever disclosed.
 *
 * Validation lives here rather than only in the API route so the rules hold
 * even if something else ever calls this. Replies are flattened to a single
 * level: replying to a reply attaches to its parent instead of nesting
 * further, which keeps the thread readable and the render non-recursive.
 */
create or replace function public.add_article_comment(
  article_slug text,
  comment_author text,
  comment_body text,
  reply_to uuid default null,
  ip text default null,
  user_agent text default null
)
returns table (id uuid, parent_id uuid, delete_token uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_article uuid;
  clean_author   text := btrim(comment_author);
  clean_body     text := btrim(comment_body);
  resolved_parent uuid;
begin
  select a.id into target_article
    from public.articles a
   where a.slug = article_slug
     and a.status = 'published';

  if target_article is null then
    raise exception 'article not found' using errcode = 'no_data_found';
  end if;

  if length(clean_author) < 1 or length(clean_author) > 60 then
    raise exception 'name must be 1-60 characters' using errcode = 'check_violation';
  end if;

  if length(clean_body) < 1 or length(clean_body) > 4000 then
    raise exception 'comment must be 1-4000 characters' using errcode = 'check_violation';
  end if;

  if reply_to is not null then
    -- Collapse to the top-level ancestor, and only within this same article.
    select coalesce(c.parent_id, c.id) into resolved_parent
      from public.article_comments c
     where c.id = reply_to
       and c.article_id = target_article;

    if resolved_parent is null then
      raise exception 'parent comment not found' using errcode = 'no_data_found';
    end if;
  end if;

  return query
  insert into public.article_comments
         (article_id, parent_id, author_name, body, author_ip, author_user_agent)
  values (target_article, resolved_parent, clean_author, clean_body, ip, user_agent)
  returning article_comments.id,
            article_comments.parent_id,
            article_comments.delete_token,
            article_comments.created_at;
end;
$$;

comment on function public.add_article_comment(text, text, text, uuid, text, text) is
  'Posts a reader comment on a published article and returns its delete token.';

revoke all on function public.add_article_comment(text, text, text, uuid, text, text) from public;
grant execute on function public.add_article_comment(text, text, text, uuid, text, text) to anon, authenticated;

/**
 * Soft-deletes a comment, but only for a caller who presents the token issued
 * when it was written. A wrong or missing token changes nothing and reports
 * false, so this cannot be used to probe for which comment ids exist.
 */
create or replace function public.delete_article_comment(comment_id uuid, token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  update public.article_comments
     set deleted_at = now()
   where id = comment_id
     and delete_token = token
     and deleted_at is null;

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

comment on function public.delete_article_comment(uuid, uuid) is
  'Author-initiated soft delete. Requires the token issued at creation time.';

revoke all on function public.delete_article_comment(uuid, uuid) from public;
grant execute on function public.delete_article_comment(uuid, uuid) to anon, authenticated;
