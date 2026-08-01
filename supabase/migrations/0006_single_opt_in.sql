-- =============================================================================
-- 0006 — Single opt-in signup
-- -----------------------------------------------------------------------------
-- Signup no longer requires clicking a confirmation link. A reader who submits
-- their address is subscribed immediately and gets a welcome email.
--
-- Abuse is handled at submission time instead of by the confirmation click, so
-- this adds the durable rate-limit counter that replaces it. The old in-process
-- limiter reset on every cold start and was per-instance, which on serverless
-- means effectively no limit.
--
-- Additive. Nothing is dropped and no subscriber row is modified — except by
-- the clearly-marked optional block at the bottom, which you choose to run.
-- =============================================================================

-- --- Rate limiting -----------------------------------------------------------
-- One row per key (an IP, or an email address) per window.

create table if not exists public.rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

comment on table public.rate_limits is
  'Fixed-window counters for public form abuse control. Safe to truncate at any time.';

alter table public.rate_limits enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this.

/**
 * Counts one hit against `limit_key` and reports whether it is still allowed.
 * Returns true when the caller is within the limit.
 */
create or replace function public.check_rate_limit(
  limit_key      text,
  max_hits       int,
  window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  insert into public.rate_limits as r (key, count, window_start)
       values (limit_key, 1, now())
  on conflict (key) do update
     set count = case
                   when r.window_start < now() - make_interval(secs => window_seconds)
                   then 1
                   else r.count + 1
                 end,
         window_start = case
                   when r.window_start < now() - make_interval(secs => window_seconds)
                   then now()
                   else r.window_start
                 end
  returning count into current_count;

  return current_count <= max_hits;
end;
$$;

comment on function public.check_rate_limit(text, int, int) is
  'Fixed-window rate limit. Returns true while the key is under max_hits.';

-- Housekeeping: drop counters nobody has touched in a day.
create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

-- =============================================================================
-- OPTIONAL — existing pending subscribers
-- -----------------------------------------------------------------------------
-- Anyone who signed up under double opt-in but never clicked the link is
-- sitting at status 'pending'. They gave you their address and asked for the
-- newsletter; under single opt-in that is a completed signup, and CAN-SPAM
-- does not require confirmation.
--
-- Converting them is a judgement call about people who did not finish the old
-- flow, so it is NOT run automatically. Uncomment and run it only if you want
-- those addresses to start receiving the newsletter.
--
--   update public.subscribers
--      set status       = 'confirmed',
--          confirmed_at = coalesce(confirmed_at, now())
--    where status = 'pending';
--
-- To see how many that affects before deciding:
--
--   select count(*) from public.subscribers where status = 'pending';
-- =============================================================================
