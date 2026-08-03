-- =============================================================================
-- 0009 — The 'in_review' article status
-- -----------------------------------------------------------------------------
-- The role model has always promised an editorial workflow: a contributor
-- writes, an editor publishes. But there was no state between "draft" and
-- "live", so a finished piece just sat in the drafts list hoping someone
-- noticed it. This adds the missing state; 0010 builds the workflow on top.
--
-- RUN THIS FILE ON ITS OWN, BEFORE 0010.
--
-- Postgres will not let a new enum value be *used* in the same transaction that
-- adds it, and the Supabase SQL Editor runs each script as one transaction. So
-- this migration is a single statement and nothing else — the policies and
-- functions that compare against 'in_review' live in 0010.
-- =============================================================================

alter type public.article_status add value if not exists 'in_review' after 'draft';
