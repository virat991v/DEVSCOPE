-- Migration 008: GitHub OAuth one-time state tokens
-- Used server-side to prevent CSRF and callback replay in the GitHub App OAuth flow.
-- State tokens are bound to the authenticated platform user, expire after 10 minutes,
-- and are consumed (deleted) exactly once on callback.

create table public.github_oauth_states (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  state_token   text not null unique,   -- cryptographically random, opaque to client
  expires_at    timestamptz not null default (now() + interval '10 minutes'),
  used_at       timestamptz,            -- set on consumption; prevents replay
  created_at    timestamptz not null default now()
);

create index github_oauth_states_token_idx   on public.github_oauth_states(state_token);
create index github_oauth_states_profile_idx on public.github_oauth_states(profile_id);

-- Auto-purge expired tokens (runs via pg_cron or can be called manually).
-- We also clean up stale rows inline during token creation.
create or replace function public.create_github_oauth_state(
  p_profile_id    uuid,
  p_institution_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  -- Purge expired tokens for this user first
  delete from public.github_oauth_states
  where profile_id = p_profile_id
    and (expires_at < now() or used_at is not null);

  -- Generate a 32-byte random hex token
  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.github_oauth_states (profile_id, institution_id, state_token)
  values (p_profile_id, p_institution_id, v_token);

  return v_token;
end;
$$;

-- Consume and validate a state token. Returns the profile_id if valid, else NULL.
create or replace function public.consume_github_oauth_state(
  p_state_token text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  update public.github_oauth_states
  set used_at = now()
  where state_token  = p_state_token
    and used_at     is null
    and expires_at   > now()
  returning profile_id into v_profile_id;

  return v_profile_id;  -- NULL if not found / expired / already used
end;
$$;

-- Only service-role (Edge Functions) may call these.
revoke all on function public.create_github_oauth_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.consume_github_oauth_state(text)         from public, anon, authenticated;
grant execute on function public.create_github_oauth_state(uuid, uuid) to service_role;
grant execute on function public.consume_github_oauth_state(text)       to service_role;

-- RLS: users can only see their own state rows (for debugging); only service_role writes
alter table public.github_oauth_states enable row level security;

-- profiles.id is the Supabase auth user ID. `auth_user_id` does not exist on
-- this schema; referencing it makes the migration fail before the OAuth state
-- RPCs are usable.
create policy "owner read" on public.github_oauth_states
  for select using (profile_id = auth.uid());

-- No direct insert/update/delete from the client
create policy "no client insert" on public.github_oauth_states
  for insert with check (false);
create policy "no client update" on public.github_oauth_states
  for update using (false);
create policy "no client delete" on public.github_oauth_states
  for delete using (false);
