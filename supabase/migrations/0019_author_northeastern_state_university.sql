-- ===========================================================================
-- 0019 — Organization byline: Northeastern State University (press releases)
-- ---------------------------------------------------------------------------
-- A profile for NSU press releases, shaped like the Journal's own house byline
-- (0017). Releases come from NSU's Office of Communications and Marketing and
-- are edited by the Journal for length and style.
--
-- Byline reads "Northeastern State University"; the short form "NSU" is its
-- handle, so the profile also resolves at /author/nsu and shows as @nsu.
--
-- Media contact: profiles have one contact field, `email`, shown as a public
-- Contact button. There are no fields for a contact's name, title, or phone:
--   David Demopoulos, Media Coordinator — demopoul@nsuok.edu, 918.444.2881
-- Note that `email` also links a newsroom login to this byline: if that address
-- is ever invited to /admin, the account will write as NSU.
--
-- `on conflict do nothing` leaves an existing row with this slug untouched.
-- ===========================================================================

insert into public.authors (
  slug, name, role, photo_url, bio, long_bio, email,
  social, related_topics, location, website,
  username, featured_quote, founding_role
) values (
  'northeastern-state-university',
  'Northeastern State University',
  -- TODO: confirm the title shown above the name. "Press Releases" describes
  -- what this byline publishes; the Journal's own house byline uses "Newsroom".
  'Press Releases',
  '/authors/northeastern-state-university.png',
  'News and announcements from Northeastern State University.',
  'News and announcements from Northeastern State University, with campuses in Tahlequah, Broken Arrow and Muskogee. Releases are provided by NSU''s Office of Communications and Marketing and edited by the Northeastern Journal for length and style.',
  'demopoul@nsuok.edu',
  -- Profiles hold one link per platform. A second Facebook link was supplied
  -- (https://www.facebook.com/share/19TTJZa4pc/?mibextid=wwXIfr) and is not listed.
  jsonb_build_object(
    'instagram', 'https://www.instagram.com/nsuriverhawks?psln=ZTRjeXZuMWphb2Nz',
    'facebook',  'https://www.facebook.com/share/1A8Xk4b3XD/?mibextid=wwXIfr'
  ),
  -- Closest existing section; no new category is created.
  array['education'],
  'Tahlequah, Broken Arrow and Muskogee, Oklahoma',
  'https://www.nsuok.edu',
  'nsu',
  -- TODO (optional): a pull quote for the profile hero.
  null,
  -- Founding credit applies only to the Journal's co-founders.
  null
)
on conflict (slug) do nothing;
