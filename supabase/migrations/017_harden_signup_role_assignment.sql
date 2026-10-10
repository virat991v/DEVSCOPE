-- Migration 017: prevent client-controlled privilege assignment at signup
--
-- Data-preserving: this only changes the auth.users signup trigger used for
-- future accounts. It does not update, revoke, or otherwise modify existing
-- profiles or role_assignments.
--
-- Privileged roles must be granted through an authorized administrative
-- workflow after the account exists. auth.users.raw_user_meta_data is supplied
-- by the client and must never determine a role assignment.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _institution_id uuid;
  _display_name   text;
  _initials       text;
begin
  select id into _institution_id
  from public.institutions
  order by created_at asc
  limit 1;

  if _institution_id is null then
    -- Preserve the existing recovery path: ensure_my_profile() will surface a
    -- clear error until an institution has been configured.
    return new;
  end if;

  _display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    split_part(new.email, '@', 1)
  );
  _initials := upper(
    left(split_part(_display_name, ' ', 1), 1)
    || left(split_part(_display_name, ' ', 2), 1)
  );
  if coalesce(_initials, '') = '' then
    _initials := upper(left(_display_name, 2));
  end if;
  if coalesce(_initials, '') = '' then
    _initials := 'U';
  end if;

  insert into public.profiles (id, institution_id, display_name, email, avatar_initials)
  values (new.id, _institution_id, _display_name, new.email, _initials)
  on conflict (id) do nothing;

  -- New self-service accounts always begin as students. The client cannot
  -- create faculty or admin authority through signup metadata.
  insert into public.role_assignments (profile_id, institution_id, role)
  values (new.id, _institution_id, 'student'::public.user_role)
  on conflict (profile_id, institution_id, role) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
