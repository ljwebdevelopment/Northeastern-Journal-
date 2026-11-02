-- ===========================================================================
-- 0017 — House byline: Northeastern Journal
-- ---------------------------------------------------------------------------
-- A profile for pieces published in the Journal's own name (introductions,
-- announcements, unsigned editorials). Copy is taken from the About page and
-- site-config.ts; social links are the official accounts in the site footer.
--
-- Bluesky is left out: author profiles support Facebook, Instagram, X, TikTok,
-- Substack, LinkedIn, and YouTube only.
--
-- `on conflict do nothing` leaves an existing row with this slug untouched.
-- ===========================================================================

insert into public.authors (
  slug, name, role, photo_url, bio, long_bio, email,
  social, related_topics, location, website,
  username, featured_quote, founding_role
) values (
  'northeastern-journal',
  'Northeastern Journal',
  'Newsroom',
  '/authors/northeastern-journal.png',
  'Independent news for northeastern Oklahoma.',
  'Northeastern Journal is an independent newsroom covering the communities of northeastern Oklahoma — civic accountability, local culture, and the voices of the people who live here.

The Journal was founded by Cheryl Leeds and Luke Johnson, who still run it day to day — Cheryl as editor, Luke as publisher. Today the Journal publishes staff reporting, columns, interviews, and community submissions.',
  -- No email: this field links a login to the byline, and the house byline
  -- should be written under by editors from their own accounts.
  null,
  jsonb_build_object(
    'substack', 'https://open.substack.com/pub/northeasternjournal',
    'facebook', 'https://www.facebook.com/share/19GKdQA5Q5/?mibextid=wwXIfr',
    'x',        'https://x.com/northeastjou'
  ),
  '{}',
  'Northeastern Oklahoma',
  -- No website: it would link the Journal's profile back to its own site.
  null,
  null,
  -- TODO (optional): a pull quote for the profile hero.
  null,
  null
)
on conflict (slug) do nothing;
