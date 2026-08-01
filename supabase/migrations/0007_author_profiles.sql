-- =============================================================================
-- 0007 — Richer author profiles
-- -----------------------------------------------------------------------------
-- `authors` carries a name, role, photo, bio, and social links. This adds the
-- rest of what a journalist profile needs: a handle, contact and location,
-- a pull quote, founding credit, and the repeatable sections (notable quotes,
-- reading recommendations, career timeline, work published elsewhere).
--
-- No new policies are required. 0001 already grants:
--   • "authors public read"      — anyone may read
--   • "authors staff write"      — admins and editors may write any row
--   • "authors edit own byline"  — a user may update the row linked to their
--                                  profile, which is what lets a journalist
--                                  edit their own page from the dashboard
--
-- Every statement is `add column if not exists`. Safe on a live database:
-- existing rows get the column defaults and nothing is rewritten.
-- =============================================================================

alter table public.authors
  -- Public handle. Shown as @username and usable in place of the slug in a
  -- profile URL. Nullable — most bylines won't set one.
  add column if not exists username text,

  add column if not exists location       text,
  add column if not exists website        text,
  -- Large pull quote in the profile hero.
  add column if not exists featured_quote text,
  -- Standing beyond the job title: "Co-Founder", "Publisher Emeritus".
  add column if not exists founding_role  text,

  -- Repeatable sections. JSONB rather than child tables: they are small,
  -- always read as a whole with the profile, and never queried across
  -- authors, so a join table would cost more than it returns.
  --   quotes:             [{ id, text, source? }]
  --   reading_list:       [{ id, title, note?, url? }]
  --   timeline:           [{ id, year, label }]
  --   professional_links: [{ id, kind, title, outlet?, url?, year?, description? }]
  --     kind ∈ syndicated | publication | award | press | portfolio
  add column if not exists quotes             jsonb not null default '[]'::jsonb,
  add column if not exists reading_list       jsonb not null default '[]'::jsonb,
  add column if not exists timeline           jsonb not null default '[]'::jsonb,
  add column if not exists professional_links jsonb not null default '[]'::jsonb,

  -- Media and availability.
  add column if not exists video_playlist text,
  add column if not exists speaking       text,
  add column if not exists podcast_url    text,

  -- Whether the public profile prints the subscriber count.
  add column if not exists show_subscriber_count boolean not null default true;

-- A handle has to be unique to stand in for a slug in a URL. Partial index so
-- the many rows without one don't collide with each other.
create unique index if not exists authors_username_key
  on public.authors (lower(username))
  where username is not null and username <> '';

comment on column public.authors.username is
  'Optional public handle. Unique when set; resolves at /author/<username>.';
comment on column public.authors.professional_links is
  'Work outside the Journal, grouped on the profile by kind.';
comment on column public.authors.show_subscriber_count is
  'When false the profile hides the number but keeps the Subscribe button.';
