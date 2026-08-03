-- ===========================================================================
-- Northeastern Journal — reference data
-- ---------------------------------------------------------------------------
-- Run this AFTER 0001_initial_schema.sql. It seeds the section list, the two
-- founding bylines, and default site settings. It does NOT create articles —
-- until an editor publishes the first real story the site keeps rendering its
-- built-in placeholder archive.
--
-- Safe to re-run.
-- ===========================================================================

insert into public.categories (slug, name, description, sort_order) values
  ('local-news',       'Local News',       'Reporting from our home communities.',                                   10),
  ('politics',         'Politics',         'Civic power, policy, and the people it affects.',                        20),
  ('community',        'Community',        'The people and institutions shaping daily life.',                        30),
  ('education',        'Education',        'Schools, learning, and the future of our classrooms.',                   40),
  ('faith',            'Faith',            'Belief, congregation, and moral life in the region.',                    50),
  ('culture',          'Culture',          'Art, tradition, and the stories we tell each other.',                    60),
  ('history',          'History',          'The long memory of a place and its people.',                             70),
  ('opinion',          'Opinion',          'Argued perspectives from our contributors.',                             80),
  ('editorial',        'Editorial',        'The Journal''s institutional voice.',                                    90),
  -- The essay family. Opinion argues a position and Editorial speaks for the
  -- Journal; these are the sections for writing that thinks out loud instead.
  ('essays',           'Essays',           'Long-form inquiry — an idea followed wherever it leads.',                91),
  ('personal-essay',   'Personal Essay',   'First-person writing on a life as it was actually lived.',               92),
  ('reflections',      'Reflections',      'Shorter meditations on place, season, and the passage of time.',         93),
  ('memoir',           'Memoir',           'Remembered lives, told by the people who lived them.',                   94),
  ('criticism',        'Criticism',        'Close readings of the art, books, and ideas in circulation.',            95),
  ('poetry',           'Poetry',           'Verse from our contributors and the wider community.',                   96),
  ('generations',      'Generations',      'Viewpoints across age and era, from longtime residents to first-time voters.', 100),
  ('interviews',       'Interviews',       'Conversations with the people making news.',                            110),
  ('books',            'Books',            'Reviews, excerpts, and reading recommendations.',                       120),
  ('national-news',    'National News',    'The stories shaping the country.',                                      130),
  ('world-news',       'World News',       'Dispatches beyond our borders.',                                        140),
  ('events',           'Events',           'Gatherings, forums, and civic calendars.',                              150),
  ('community-voices', 'Community Voices', 'Reader-submitted letters and essays.',                                  160)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      sort_order  = excluded.sort_order;

-- Founding bylines. Edit the bios from /admin/team once you are signed in.
insert into public.authors (slug, name, role, bio, long_bio, email) values
  (
    'cheryl-leeds',
    'Cheryl Leeds',
    'Co-Founder & Editor',
    'Co-founder and editor of the Northeastern Journal.',
    'Cheryl Leeds co-founded the Northeastern Journal and edits its daily report, with a focus on civic accountability and community coverage across northeastern Oklahoma.',
    'caleeds77@gmail.com'
  ),
  (
    'luke-johnson',
    'Luke Johnson',
    'Co-Founder & Publisher',
    'Co-founder and publisher of the Northeastern Journal.',
    'Luke Johnson co-founded the Northeastern Journal and oversees its publishing operation, from the newsroom''s technology to its relationship with readers.',
    'lljohnson1201@gmail.com'
  )
on conflict (slug) do update
  set name  = excluded.name,
      role  = excluded.role,
      email = excluded.email;

-- Connect each founder's login to their byline the moment they first sign in.
--
-- INSERT only. `author_id` decides whose name appears on an article, so it is
-- one of the columns protect_profile_privileges() pins on UPDATE — otherwise a
-- contributor could point their profile at someone else's byline. Postgres
-- fires BEFORE triggers in name order, so profiles_link_author would run first
-- and profiles_protect_privileges would simply revert it. Linking at signup is
-- the only case that matters; afterwards an admin sets it.
create or replace function public.link_profile_to_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched uuid;
begin
  if new.author_id is null then
    select id into matched from public.authors where lower(email) = lower(new.email);
    if matched is not null then
      new.author_id := matched;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_link_author on public.profiles;
create trigger profiles_link_author before insert on public.profiles
  for each row execute function public.link_profile_to_author();

-- Default settings, editable from /admin/settings.
insert into public.settings (key, value) values
  ('newsletter', jsonb_build_object(
    'from_name',      'Northeastern Journal',
    'from_email',     'newsletter@northeasternjournal.com',
    'reply_to',       'editor@northeasternjournal.com',
    'welcome_subject','Welcome to the Northeastern Journal',
    'mailing_address','Northeastern Journal, Northeastern Oklahoma'
  )),
  ('site', jsonb_build_object(
    'tagline',     'Independent News for Northeastern Oklahoma',
    'accepting_contributors', true
  ))
on conflict (key) do nothing;
