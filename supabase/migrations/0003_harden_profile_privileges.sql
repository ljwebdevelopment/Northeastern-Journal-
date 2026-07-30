-- ===========================================================================
-- Northeastern Journal — close a privilege-escalation hole in `profiles`
-- ---------------------------------------------------------------------------
-- SECURITY FIX. Run this if you applied 0001 before this file existed.
--
-- The problem
-- -----------
-- The "own profile updatable" policy allows a signed-in user to update their
-- own profile row. Row Level Security gates *rows*, not *columns*, so that
-- policy also allowed:
--
--     update public.profiles set role = 'admin' where id = auth.uid();
--
-- Because auth_role() reads profiles.role, anyone who could sign in — and
-- magic-link signup is open to any email address — could promote themselves
-- to administrator and satisfy every admin policy in the database.
--
-- The fix
-- -------
-- A BEFORE UPDATE trigger pins `role` and `author_id` to their previous
-- values unless the caller is an administrator or the service role.
--
-- Fresh installs get this from 0001 already; running it twice is harmless.
-- ===========================================================================

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No auth.uid(): the service role, or a SECURITY DEFINER trigger such as
  -- handle_new_user running during signup. Both are trusted.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Everyone else: silently keep the privileged columns as they were, rather
  -- than raising. A user editing their display name shouldn't get an error
  -- because the form also round-tripped a role field.
  new.role      := old.role;
  new.author_id := old.author_id;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- `author_id` is now pinned on UPDATE, so the byline-linking trigger only has
-- an effect at INSERT. Postgres fires BEFORE triggers in name order, which
-- would run profiles_link_author first and then revert it — narrow it to
-- INSERT so the intent is explicit rather than accidental.
drop trigger if exists profiles_link_author on public.profiles;
create trigger profiles_link_author before insert on public.profiles
  for each row execute function public.link_profile_to_author();

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Sign in as a non-admin and run this in the SQL Editor's "run as" context, or
-- call it from the client. `role` should come back unchanged:
--
--   update public.profiles set role = 'admin' where id = auth.uid();
--   select role from public.profiles where id = auth.uid();
--
-- Also confirm no reader has already escalated:
--
--   select email, role from public.profiles where role in ('admin', 'editor');
--
-- Only the two founding addresses should appear.
