-- ============================================================
-- Migration 014: repair GitHub OAuth state storage
--
-- The original migration used profiles.auth_user_id in an RLS policy, but the
-- schema links profiles directly with profiles.id = auth.users.id. PostgreSQL
-- rejects that policy, leaving github-start-oauth unable to create its CSRF
-- state token. This migration is safe for both partial and fresh deployments.
-- ============================================================

create table if not exists public.github_oauth_states (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  state_token    text not null unique,
  expires_at     timestamptz not null default (now() + interval '10 minutes'),
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists github_oauth_states_token_idx
  on public.github_oauth_states(state_token);
create index if not exists github_oauth_states_profile_idx
  on public.github_oauth_states(profile_id);

create or replace function public.create_github_oauth_state(
  p_profile_id uuid,
  p_institution_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  delete from public.github_oauth_states
  where profile_id = p_profile_id
    and (expires_at < now() or used_at is not null);

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.github_oauth_states (profile_id, institution_id, state_token)
  values (p_profile_id, p_institution_id, v_token);

  return v_token;
end;
$$;

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
  where state_token = p_state_token
    and used_at is null
    and expires_at > now()
  returning profile_id into v_profile_id;

  return v_profile_id;
end;
$$;

revoke all on function public.create_github_oauth_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.consume_github_oauth_state(text) from public, anon, authenticated;
grant execute on function public.create_github_oauth_state(uuid, uuid) to service_role;
grant execute on function public.consume_github_oauth_state(text) to service_role;

alter table public.github_oauth_states enable row level security;
drop policy if exists "owner read" on public.github_oauth_states;
create policy "owner read" on public.github_oauth_states
  for select using (profile_id = auth.uid());
