-- ===========================================================================
-- 0016 — Contributor byline: Douglas Vandergraph (Faith)
-- ---------------------------------------------------------------------------
-- Adds one row to public.authors, shaped like the live founder profiles
-- (short one-line `bio`, longer `long_bio`, `social` keyed by platform).
--
-- `on conflict do nothing`: if the byline already exists — say it was created
-- from /admin/team first — this leaves it alone rather than overwriting edits.
--
-- Before running, resolve the TODOs below.
-- ===========================================================================

insert into public.authors (
  slug, name, role, photo_url, bio, long_bio, email,
  social, related_topics, location, website,
  username, featured_quote, founding_role
) values (
  'douglas-vandergraph',
  'Douglas Vandergraph',
  -- TODO: confirm his title. 'Contributor' is the schema default for new bylines.
  'Contributor',
  -- TODO: the live profiles keep photos in Supabase Storage (media bucket).
  -- Either deploy public/authors/douglas-vandergraph.jpg with the site, or
  -- upload that file from /admin/profile and use the URL it returns.
  '/authors/douglas-vandergraph.jpg',
  'Christian writer, Bible teacher, podcaster, and digital creator.',
  'Douglas Vandergraph is a Christian writer, Bible teacher, podcaster, and digital creator whose work centers on Jesus Christ, Scripture, spiritual growth, practical encouragement, and long-form Bible study. He has built an extensive free Christian library and a YouTube community of approximately 600,000 subscribers, with more than 2,000 videos across his broader body of work. Douglas writes and speaks to help people connect the teachings of Jesus with grief, prayer, forgiveness, perseverance, purpose, hope, and ordinary life.',
  -- TODO: contact email. Both founder profiles have one; it also links his
  -- login to this byline when he first signs in.
  null,
  jsonb_build_object(
    'facebook',  'https://www.facebook.com/douglas.vandergraph.2025/',
    'instagram', 'https://www.instagram.com/douglasvandergraph/',
    'substack',  'https://substack.com/@douglasbvandergraph',
    'x',         'https://x.com/dvandergraph1',
    'youtube',   'https://www.youtube.com/@douglasvandergraph',
    'tiktok',    'https://www.tiktok.com/@douglasvandergraph'
  ),
  array['faith'],
  'Fort Collins, Colorado',
  'https://www.douglasvandergraph.com',
  -- Optional handle (/author/<username>). Cheryl's profile has one, Luke's doesn't.
  null,
  -- TODO: pull quote for the profile hero. Both founder profiles have one.
  null,
  -- Founding credit applies only to the co-founders.
  null
)
on conflict (slug) do nothing;
