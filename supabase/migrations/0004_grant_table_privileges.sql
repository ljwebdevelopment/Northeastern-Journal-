-- ===========================================================================
-- Northeastern Journal — grant table privileges to the API roles
-- ---------------------------------------------------------------------------
-- Run this if you applied 0001 before this file existed and every request
-- fails with:
--
--     {"code":"42501","message":"permission denied for table categories",
--      "hint":"Grant the required privileges to the current role with:
--              GRANT SELECT ON public.categories TO anon;"}
--
-- Why it happens
-- --------------
-- Row Level Security decides *which rows* a role may touch. It does not grant
-- access to the table in the first place — that is a separate, older Postgres
-- mechanism. Supabase's default privileges normally hand `anon`,
-- `authenticated`, and `service_role` access to new tables in `public`, but
-- tables created from the SQL Editor do not always inherit them, and then
-- every single query 401s even though the policies are perfect.
--
-- Fresh installs get these grants from 0001. Running this twice is harmless.
-- ===========================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Public content, readable by anyone. Note what is absent: profiles,
-- admin_allowlist, subscribers, and email_sends are never exposed to `anon`,
-- which is what keeps the mailing list private even if a policy were wrong.
grant select on
  public.articles,
  public.authors,
  public.categories,
  public.tags,
  public.article_tags,
  public.media,
  public.settings
to anon;

-- Signed-in users. RLS narrows every one of these to what their role allows —
-- a reader still cannot read a draft or see a subscriber.
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

-- The service role bypasses RLS and is used only by server code: newsletter
-- signup/unsubscribe and the scheduled-publish cron.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- The cron calls this by RPC as the service role. 0001 revokes it from
-- everyone else; make sure the one caller that needs it can still execute.
grant execute on function public.publish_due_articles() to service_role;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   select grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_name = 'categories' and grantee in ('anon','authenticated');
--
-- Then, from a shell:
--   curl "$SUPABASE_URL/rest/v1/categories?select=slug&limit=1" \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
-- should return JSON rather than a 42501 error.
