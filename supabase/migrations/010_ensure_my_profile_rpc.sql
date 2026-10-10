-- ============================================================
-- Migration: 010_ensure_my_profile_rpc.sql
-- Purpose:   SECURITY DEFINER RPC called by AuthContext.fetchOrRecoverProfile()
--            when a profile row is missing for an authenticated user.
--
-- This handles:
--   - First-time Google OAuth users (DB trigger may have missed if no institution)
--   - Any user whose trigger failed silently
--
-- Security:
--   - SECURITY DEFINER so it can INSERT into profiles/role_assignments bypassing RLS
--   - Role is ALWAYS set to 'student' — cannot be elevated via client metadata
--   - Only the calling authenticated user's own profile is created (auth.uid())
--   - REVOKE from anon so only authenticated users can call it
--
-- Run in Supabase SQL Editor → New query → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _institution_id uuid;
  _full_name      text;
  _email          text;
  _initials       text;
BEGIN
  -- 1. Find the first institution (default for new users)
  SELECT id INTO _institution_id FROM public.institutions ORDER BY created_at ASC LIMIT 1;
  IF _institution_id IS NULL THEN
    RAISE WARNING 'ensure_my_profile: no institution found, cannot create profile for %', auth.uid();
    RETURN;
  END IF;

  -- 2. Pull user metadata from auth.users
  SELECT
    COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      raw_user_meta_data->>'display_name',
      split_part(email, '@', 1),
      'User'
    ),
    email
  INTO _full_name, _email
  FROM auth.users
  WHERE id = auth.uid();

  -- 3. Build initials (max 2 uppercase chars)
  _initials := UPPER(
    COALESCE(
      LEFT(split_part(_full_name, ' ', 1), 1) || LEFT(split_part(_full_name, ' ', 2), 1),
      LEFT(_full_name, 2)
    )
  );
  IF length(trim(_initials)) = 0 THEN _initials := 'U'; END IF;

  -- 4. Upsert profile — skip if already exists
  INSERT INTO public.profiles (
    id, institution_id, display_name, email, avatar_initials
  )
  VALUES (
    auth.uid(), _institution_id, _full_name, COALESCE(_email, ''), _initials
  )
  ON CONFLICT (id) DO NOTHING;

  -- 5. Upsert role_assignment — always 'student', skip if one already exists
  --    ON CONFLICT preserves any existing faculty/admin role.
  INSERT INTO public.role_assignments (
    profile_id, institution_id, role, assigned_at
  )
  VALUES (
    auth.uid(), _institution_id, 'student', now()
  )
  ON CONFLICT (profile_id, institution_id) DO NOTHING;
END;
$$;

-- Allow authenticated users to call this; deny everyone else
REVOKE EXECUTE ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- ── Verify (run separately) ───────────────────────────────────────────────────
-- SELECT routine_name, security_type
-- FROM information_schema.routines
-- WHERE routine_name = 'ensure_my_profile' AND routine_schema = 'public';
