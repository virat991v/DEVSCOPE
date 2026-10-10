-- Migration 016: make GitHub OAuth state generation compatible with Supabase's
-- managed extension schema. On hosted projects pgcrypto is installed in
-- `extensions`, while these SECURITY DEFINER functions deliberately keep a
-- restricted search_path. Qualify the cryptographic function explicitly.

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

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.github_oauth_states (profile_id, institution_id, state_token)
  values (p_profile_id, p_institution_id, v_token);

  return v_token;
end;
$$;

revoke all on function public.create_github_oauth_state(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_github_oauth_state(uuid, uuid) to service_role;
