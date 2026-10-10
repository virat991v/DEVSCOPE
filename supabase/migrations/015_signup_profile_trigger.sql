-- ============================================================
-- Migration: 015_signup_profile_trigger.sql
-- Purpose:   Auto-create a profiles + role_assignments row when
--            a new user signs up via supabase.auth.signUp().
--
-- How it works:
--   1. Supabase calls signUp() with options.data = { full_name, role, ... }
--   2. Supabase inserts into auth.users with raw_user_meta_data set to that object
--   3. This trigger fires AFTER INSERT on auth.users
--   4. It creates a minimal profiles row (institution_id = first institution found)
--   5. It creates a role_assignments row using the role from metadata
--
-- IMPORTANT:
--   - This trigger uses the FIRST institution in the institutions table as the
--     default institution. Once institution onboarding is implemented, replace
--     this with proper institution lookup / selection.
--   - RLS on profiles allows INSERT only when auth.uid() = id, BUT triggers
--     run as SECURITY DEFINER (elevated) so they bypass RLS.
--   - Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── Helper: resolve role safely ──────────────────────────────────────────────
-- Reads 'role' from raw_user_meta_data, defaults to 'student' if missing or invalid.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _institution_id uuid;
  _role           text;
  _display_name   text;
  _initials       text;
  _full_name      text;
begin
  -- 1. Resolve the institution (fallback: first institution in the table)
  select id into _institution_id from public.institutions order by created_at asc limit 1;

  if _institution_id is null then
    -- No institution exists yet — skip profile creation silently.
    -- The admin will need to create the institution first, then manually
    -- insert profiles for users who signed up before that.
    return new;
  end if;

  -- 2. Extract metadata from the auth user
  _full_name    := coalesce(
    (new.raw_user_meta_data ->> 'full_name'),
    (new.raw_user_meta_data ->> 'display_name'),
    split_part(new.email, '@', 1)
  );
  _role         := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  _display_name := _full_name;

  -- 3. Sanitize role — only 'student', 'faculty', 'admin' are valid
  if _role not in ('student', 'faculty', 'admin') then
    _role := 'student';
  end if;

  -- 4. Build initials (first two capital letters from the name parts)
  _initials := upper(
    coalesce(
      left(split_part(_full_name, ' ', 1), 1) ||
      left(split_part(_full_name, ' ', 2), 1),
      left(_full_name, 2)
    )
  );
  if length(_initials) = 0 then
    _initials := 'U';
  end if;

  -- 5. Insert profile
  insert into public.profiles (
    id,
    institution_id,
    display_name,
    email,
    avatar_initials,
    roll_number,
    github_username
  ) values (
    new.id,
    _institution_id,
    _display_name,
    new.email,
    _initials,
    null,
    null
  )
  on conflict (id) do nothing;   -- idempotent: skip if already exists

  -- 6. Insert role assignment
  insert into public.role_assignments (
    profile_id,
    institution_id,
    role
  ) values (
    new.id,
    _institution_id,
    _role
  )
  -- The schema's unique key also contains role. The old two-column conflict
  -- target did not match any unique constraint and aborted the auth.users
  -- insert (which made successful authentication look like a login failure).
  on conflict (profile_id, institution_id, role) do nothing;

  return new;
end;
$$;

-- ── Attach the trigger to auth.users ─────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ── Grant execute to service role only (not anon/authenticated) ──────────────
-- The trigger itself runs as SECURITY DEFINER so the caller's role doesn't matter,
-- but we revoke public execute as a defense-in-depth measure.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant  execute on function public.handle_new_user() to service_role;

-- ── Verify (run separately after the above) ──────────────────────────────────
-- select trigger_name, event_manipulation, event_object_table
-- from information_schema.triggers
-- where trigger_name = 'on_auth_user_created';
