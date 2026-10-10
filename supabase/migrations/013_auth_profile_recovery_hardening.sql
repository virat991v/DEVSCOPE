-- ============================================================
-- Migration 013: durable profile recovery for authenticated users
--
-- Replaces the earlier recovery RPC so it matches the actual
-- role_assignments unique key: (profile_id, institution_id, role).
-- It preserves every existing faculty/admin assignment and gives a new
-- recovered profile the student role only.
-- ============================================================

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _user_id         uuid := auth.uid();
  _institution_id  uuid;
  _email           text;
  _metadata        jsonb;
  _display_name    text;
  _initials        text;
begin
  if _user_id is null then
    raise exception 'An authenticated user is required to provision a profile';
  end if;

  select institution_id into _institution_id
  from public.profiles
  where id = _user_id;

  if found then
    if not exists (
      select 1
      from public.role_assignments
      where profile_id = _user_id
        and institution_id = _institution_id
        and revoked_at is null
    ) then
      insert into public.role_assignments (profile_id, institution_id, role)
      values (_user_id, _institution_id, 'student')
      on conflict (profile_id, institution_id, role) do nothing;
    end if;
    return;
  end if;

  select email, raw_user_meta_data into _email, _metadata
  from auth.users
  where id = _user_id;

  if _email is null then
    raise exception 'Authenticated user % was not found', _user_id;
  end if;

  select id into _institution_id
  from public.institutions
  order by created_at asc
  limit 1;

  if _institution_id is null then
    raise exception 'No institution exists to associate with this account';
  end if;

  _display_name := coalesce(
    _metadata ->> 'full_name',
    _metadata ->> 'name',
    _metadata ->> 'display_name',
    split_part(_email, '@', 1)
  );
  _initials := upper(left(split_part(_display_name, ' ', 1), 1) || left(split_part(_display_name, ' ', 2), 1));
  if coalesce(_initials, '') = '' then
    _initials := upper(left(_display_name, 2));
  end if;
  if coalesce(_initials, '') = '' then
    _initials := 'U';
  end if;

  insert into public.profiles (id, institution_id, display_name, email, avatar_initials)
  values (_user_id, _institution_id, _display_name, _email, _initials)
  on conflict (id) do nothing;

  insert into public.role_assignments (profile_id, institution_id, role)
  values (_user_id, _institution_id, 'student')
  on conflict (profile_id, institution_id, role) do nothing;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- The existing signup trigger must use the same valid conflict target. This
-- replaces the deployed function as well as fixing fresh installations.
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
begin
  select id into _institution_id
  from public.institutions
  order by created_at asc
  limit 1;

  if _institution_id is null then
    return new;
  end if;

  _display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    split_part(new.email, '@', 1)
  );
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  if _role not in ('student', 'faculty', 'admin') then
    _role := 'student';
  end if;

  _initials := upper(left(split_part(_display_name, ' ', 1), 1) || left(split_part(_display_name, ' ', 2), 1));
  if coalesce(_initials, '') = '' then
    _initials := upper(left(_display_name, 2));
  end if;
  if coalesce(_initials, '') = '' then
    _initials := 'U';
  end if;

  insert into public.profiles (id, institution_id, display_name, email, avatar_initials)
  values (new.id, _institution_id, _display_name, new.email, _initials)
  on conflict (id) do nothing;

  insert into public.role_assignments (profile_id, institution_id, role)
  values (new.id, _institution_id, _role::public.user_role)
  on conflict (profile_id, institution_id, role) do nothing;

  return new;
end;
$$;

drop policy if exists "profiles: insert on signup" on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists role_assignments_owner_insert on public.role_assignments;
