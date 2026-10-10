-- ============================================================
-- Migration 011: Secure GitHub access token storage
--
-- Stores GitHub user-to-server OAuth tokens (and future app
-- installation tokens) server-side only.
--
-- Security design:
--   • RLS blocks ALL direct client reads — no SELECT policy for
--     authenticated users on this table.
--   • Tokens are only readable by service_role (Edge Functions).
--   • The anon/authenticated roles have zero access.
--   • A "sync trigger" column on github_accounts (last_sync_at,
--     connection_state) is what the frontend reads — never tokens.
--
-- Run in Supabase SQL Editor → New query → Run
-- ============================================================

create table public.github_access_tokens (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id)         on delete cascade,
  institution_id  uuid not null references public.institutions(id)     on delete cascade,
  github_id       text not null,               -- matches github_accounts.github_id
  -- Token fields — never exposed to the client via RLS
  access_token    text not null,               -- GitHub user-to-server OAuth token
  token_type      text not null default 'bearer',
  token_scope     text,                        -- space-separated scopes granted
  expires_at      timestamptz,                 -- null = non-expiring (classic tokens)
  -- Rotation tracking
  rotated_at      timestamptz,
  previous_token  text,                        -- kept for overlap window during rotation
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One token record per student per institution
  unique (profile_id, institution_id)
);

create index github_access_tokens_profile_idx on public.github_access_tokens(profile_id);

-- ── RLS: block ALL client access ─────────────────────────────────────────────
-- This is intentional and complete. Tokens are only read by service_role in
-- Edge Functions. No client-side query should ever touch this table.

alter table public.github_access_tokens enable row level security;

-- Explicit deny policies (belt-and-suspenders; default-deny is already in effect
-- but being explicit makes the intent clear in pg_policies output)
create policy "tokens: no client select" on public.github_access_tokens
  for select using (false);

create policy "tokens: no client insert" on public.github_access_tokens
  for insert with check (false);

create policy "tokens: no client update" on public.github_access_tokens
  for update using (false);

create policy "tokens: no client delete" on public.github_access_tokens
  for delete using (false);

-- updated_at trigger
create trigger github_access_tokens_updated_at
  before update on public.github_access_tokens
  for each row execute function public.set_updated_at();

-- ── Verify (run separately) ───────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'github_access_tokens';
-- Expected: 4 rows, all with qual = 'false'
