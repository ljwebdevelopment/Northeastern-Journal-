-- =============================================================================
-- 0015 — Essay sections
-- -----------------------------------------------------------------------------
-- Six new sections for reflective and first-person writing.
--
-- The section list already had two homes for a point of view: Opinion, which
-- argues a position, and Editorial, which is the Journal speaking as an
-- institution. Neither fits an essay — writing that thinks out loud, works
-- through a question without arriving at a verdict, or simply remembers. That
-- work was landing in Opinion or Community Voices for want of anywhere else,
-- which mislabels it for readers and makes it unfindable later.
--
-- They sort between Editorial (90) and Generations (100), so the essay family
-- reads as one block in the section list rather than scattered through it.
--
-- Additive, and safe to re-run: this only inserts rows into `categories` and
-- refreshes the name, description, and sort order of a slug that already
-- exists. No article, author, or existing section is touched. Sections with
-- nothing published in them stay out of the navigation on their own — see
-- `lib/navigation.ts` — so nothing appears on the site until an editor files
-- into one.
--
-- Run it in Supabase Dashboard → SQL Editor.
-- =============================================================================

insert into public.categories (slug, name, description, sort_order) values
  ('essays',         'Essays',         'Long-form inquiry — an idea followed wherever it leads.',        91),
  ('personal-essay', 'Personal Essay', 'First-person writing on a life as it was actually lived.',       92),
  ('reflections',    'Reflections',    'Shorter meditations on place, season, and the passage of time.', 93),
  ('memoir',         'Memoir',         'Remembered lives, told by the people who lived them.',           94),
  ('criticism',      'Criticism',      'Close readings of the art, books, and ideas in circulation.',    95),
  ('poetry',         'Poetry',         'Verse from our contributors and the wider community.',           96)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      sort_order  = excluded.sort_order;
