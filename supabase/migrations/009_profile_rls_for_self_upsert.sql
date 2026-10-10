-- ============================================================
-- Migration: 009_profile_rls_for_self_upsert.sql
-- Purpose:   Allow authenticated users to INSERT and SELECT their own
--            profile row. Required for fetchOrCreateProfile() to work
--            client-side for first-time Google OAuth users.
--
-- Background:
--   Migration 006 enables RLS on all tables. The profiles table has a
--   SELECT policy but was missing an INSERT policy for the owner.
--   Without INSERT permission, the client-side upsert in AuthContext
--   (fetchOrCreateProfile) silently fails and returns null, causing the
--   auth loop.
--
-- Safety:
--   - INSERT is restricted to auth.uid() = id (users can only insert themselves)
--   - UPDATE is restricted the same way
--   - role_assignments INSERT is also added here for the same reason
--   - The trigger (migration 008) still runs for email signup — this is a
--     fallback for cases the trigger missed (no institution at signup time,
--     first-time OAuth users, etc.)
--
-- Run this in Supabase SQL Editor → New query → Run
-- ============================================================

-- ── profiles: allow owner INSERT ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_owner_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_owner_insert
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id)
    $policy$;
  END IF;
END $$;

-- ── profiles: allow owner SELECT (may already exist, guard with IF NOT EXISTS) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_owner_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_owner_select
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id)
    $policy$;
  END IF;
END $$;

-- ── profiles: allow owner UPDATE (display_name, avatar_initials, github_username) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_owner_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_owner_update
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)
    $policy$;
  END IF;
END $$;

-- ── role_assignments: allow owner INSERT for self-signup flow ─────────────────
-- The trigger runs as SECURITY DEFINER so it doesn't need this, but the
-- client-side upsert fallback does.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'role_assignments'
      AND policyname = 'role_assignments_owner_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY role_assignments_owner_insert
      ON public.role_assignments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = profile_id)
    $policy$;
  END IF;
END $$;

-- ── role_assignments: allow owner SELECT ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'role_assignments'
      AND policyname = 'role_assignments_owner_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY role_assignments_owner_select
      ON public.role_assignments
      FOR SELECT
      TO authenticated
      USING (auth.uid() = profile_id)
    $policy$;
  END IF;
END $$;

-- ── institutions: allow any authenticated user to SELECT ──────────────────────
-- Required for fetchOrCreateProfile to resolve the institution_id.
-- Institutions are not secret — they're referenced in every user's profile.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'institutions'
      AND policyname = 'institutions_authenticated_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY institutions_authenticated_select
      ON public.institutions
      FOR SELECT
      TO authenticated
      USING (true)
    $policy$;
  END IF;
END $$;

-- ── Verify: list all policies on these tables ─────────────────────────────────
-- Run this separately to confirm policies were created:
--
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('profiles', 'role_assignments', 'institutions')
-- ORDER BY tablename, policyname;
