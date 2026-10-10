-- Migration 018: connected classroom core
--
-- This is an additive, data-preserving migration. It introduces the minimum
-- live workflow needed for a faculty member to create a classroom, students to
-- join it, faculty to publish a stream post or assignment, and enrolled
-- students to receive persisted in-app notifications.
--
-- Existing batch-based records are retained. A classroom belongs to a batch,
-- but classroom membership is the authorization boundary for its stream and
-- classroom-specific assignments.

create type public.classroom_enrollment_mode as enum (
  'join_code',
  'approval',
  'faculty_managed'
);

create type public.classroom_membership_status as enum (
  'active',
  'pending',
  'left',
  'removed'
);

create table public.classrooms (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete restrict,
  course_id       uuid not null references public.academic_courses(id) on delete restrict,
  batch_id        uuid not null references public.academic_batches(id) on delete restrict,
  name            text not null check (char_length(btrim(name)) between 1 and 160),
  description     text not null default '' check (char_length(description) <= 10000),
  join_code       text not null unique check (join_code = upper(join_code) and char_length(join_code) = 10),
  enrollment_mode public.classroom_enrollment_mode not null default 'join_code',
  is_archived     boolean not null default false,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index classrooms_institution_batch_idx on public.classrooms(institution_id, batch_id);
create index classrooms_course_idx on public.classrooms(course_id);
create index classrooms_active_idx on public.classrooms(institution_id, is_archived);

create table public.classroom_faculty (
  classroom_id          uuid not null references public.classrooms(id) on delete cascade,
  faculty_id            uuid not null references public.profiles(id) on delete restrict,
  faculty_display_name  text not null default '',
  is_primary            boolean not null default false,
  assigned_at           timestamptz not null default now(),
  revoked_at            timestamptz,
  primary key (classroom_id, faculty_id)
);

create index classroom_faculty_faculty_idx on public.classroom_faculty(faculty_id) where revoked_at is null;

create table public.classroom_memberships (
  classroom_id  uuid not null references public.classrooms(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete restrict,
  status        public.classroom_membership_status not null default 'active',
  joined_at     timestamptz not null default now(),
  left_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (classroom_id, profile_id)
);

create index classroom_memberships_profile_idx on public.classroom_memberships(profile_id, status);
create index classroom_memberships_classroom_idx on public.classroom_memberships(classroom_id, status);

create table public.announcements (
  id                    uuid primary key default gen_random_uuid(),
  classroom_id          uuid not null references public.classrooms(id) on delete cascade,
  author_id             uuid not null references public.profiles(id) on delete restrict,
  author_display_name   text not null,
  title                 text not null check (char_length(btrim(title)) between 1 and 180),
  body                  text not null check (char_length(btrim(body)) between 1 and 10000),
  published_at          timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index announcements_classroom_published_idx on public.announcements(classroom_id, published_at desc);

-- Classroom-specific assignments keep the existing assignments table and its
-- historical batch records intact. New classroom assignments must have both a
-- batch (for legacy reporting) and a classroom (for precise authorization).
alter table public.assignments
  add column if not exists classroom_id uuid references public.classrooms(id) on delete restrict;

create index if not exists assignments_classroom_deadline_idx
  on public.assignments(classroom_id, deadline) where classroom_id is not null;

create trigger classrooms_updated_at before update on public.classrooms
  for each row execute function public.set_updated_at();
create trigger classroom_memberships_updated_at before update on public.classroom_memberships
  for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER authorization helpers keep policy checks concise without
-- allowing the caller to select protected membership rows directly.
create or replace function public.auth_is_classroom_faculty(p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.classroom_faculty cf
    where cf.classroom_id = p_classroom_id
      and cf.faculty_id = auth.uid()
      and cf.revoked_at is null
  );
$$;

create or replace function public.auth_is_active_classroom_student(p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.classroom_memberships cm
    where cm.classroom_id = p_classroom_id
      and cm.profile_id = auth.uid()
      and cm.status = 'active'
  );
$$;

revoke all on function public.auth_is_classroom_faculty(uuid) from public, anon;
revoke all on function public.auth_is_active_classroom_student(uuid) from public, anon;
grant execute on function public.auth_is_classroom_faculty(uuid) to authenticated, service_role;
grant execute on function public.auth_is_active_classroom_student(uuid) to authenticated, service_role;

-- ─── RLS ──────────────────────────────────────────────────────────────────

alter table public.classrooms enable row level security;
create policy "classrooms: participants read" on public.classrooms
  for select using (
    institution_id = public.auth_institution_id()
    and (
      public.auth_role() = 'admin'
      or public.auth_is_classroom_faculty(id)
      or public.auth_is_active_classroom_student(id)
    )
  );

alter table public.classroom_faculty enable row level security;
create policy "classroom_faculty: participants read" on public.classroom_faculty
  for select using (
    public.auth_is_classroom_faculty(classroom_id)
    or public.auth_is_active_classroom_student(classroom_id)
    or exists (
      select 1 from public.classrooms c
      where c.id = classroom_faculty.classroom_id
        and c.institution_id = public.auth_institution_id()
        and public.auth_role() = 'admin'
    )
  );

alter table public.classroom_memberships enable row level security;
create policy "classroom_memberships: student reads own" on public.classroom_memberships
  for select using (profile_id = auth.uid());
create policy "classroom_memberships: faculty reads classroom roster" on public.classroom_memberships
  for select using (public.auth_is_classroom_faculty(classroom_id));
create policy "classroom_memberships: admin reads institution" on public.classroom_memberships
  for select using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_memberships.classroom_id
        and c.institution_id = public.auth_institution_id()
        and public.auth_role() = 'admin'
    )
  );

alter table public.announcements enable row level security;
create policy "announcements: classroom participants read" on public.announcements
  for select using (
    public.auth_is_classroom_faculty(classroom_id)
    or public.auth_is_active_classroom_student(classroom_id)
    or exists (
      select 1 from public.classrooms c
      where c.id = announcements.classroom_id
        and c.institution_id = public.auth_institution_id()
        and public.auth_role() = 'admin'
    )
  );

-- Existing batch-only assignment policies must not grant a student access to
-- a classroom-specific assignment unless that student is an active member of
-- that classroom.
drop policy if exists "assignments: published visible to batch members" on public.assignments;
create policy "assignments: published visible to authorized recipients" on public.assignments
  for select using (
    state = 'published'
    and (
      (classroom_id is null and public.auth_student_in_batch(batch_id))
      or (classroom_id is not null and public.auth_is_active_classroom_student(classroom_id))
      or (
        public.auth_role() = 'faculty'
        and (
          (classroom_id is null and public.auth_can_access_batch(batch_id))
          or (classroom_id is not null and public.auth_is_classroom_faculty(classroom_id))
        )
      )
      or public.auth_role() = 'admin'
    )
  );

drop policy if exists "assignments: faculty manages assigned batches" on public.assignments;
create policy "assignments: faculty manages assigned classroom or batch" on public.assignments
  for all using (
    public.auth_role() = 'faculty'
    and (
      (classroom_id is null and public.auth_can_access_batch(batch_id))
      or (classroom_id is not null and public.auth_is_classroom_faculty(classroom_id))
    )
  );

-- Students may create or revise their own submissions only for an assignment
-- visible to their active batch/classroom membership. Faculty evaluation
-- policies remain separate and cannot be satisfied by a student role.
drop policy if exists "submissions: student creates own" on public.submissions;
create policy "submissions: student creates own authorized assignment" on public.submissions
  for insert with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and a.state = 'published'
        and (
          (a.classroom_id is null and public.auth_student_in_batch(a.batch_id))
          or (a.classroom_id is not null and public.auth_is_active_classroom_student(a.classroom_id))
        )
    )
  );

drop policy if exists "submissions: student updates own draft" on public.submissions;
create policy "submissions: student revises own authorized submission" on public.submissions
  for update using (
    profile_id = auth.uid()
    and state in ('not_started', 'draft', 'needs_revision')
  )
  with check (
    profile_id = auth.uid()
    and state in ('draft', 'submitted')
    and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and a.state = 'published'
        and (
          (a.classroom_id is null and public.auth_student_in_batch(a.batch_id))
          or (a.classroom_id is not null and public.auth_is_active_classroom_student(a.classroom_id))
        )
    )
  );

-- ─── Authorized command functions ─────────────────────────────────────────

create or replace function public.create_classroom(
  p_name text,
  p_course_id uuid,
  p_batch_id uuid,
  p_description text default '',
  p_enrollment_mode public.classroom_enrollment_mode default 'join_code'
) returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_institution_id uuid := public.auth_institution_id();
  v_role public.user_role := public.auth_role();
  v_batch_institution_id uuid;
  v_course_institution_id uuid;
  v_actor_name text;
  v_join_code text;
  v_classroom_id uuid;
begin
  if v_actor_id is null or v_institution_id is null then
    raise exception 'An authenticated institution member is required';
  end if;
  if v_role is null or v_role not in ('faculty', 'admin') then
    raise exception 'Only faculty or administrators can create a classroom';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 160 then
    raise exception 'Classroom name must contain 1 to 160 characters';
  end if;
  if char_length(coalesce(p_description, '')) > 10000 then
    raise exception 'Classroom description is too long';
  end if;

  select institution_id into v_batch_institution_id from public.academic_batches where id = p_batch_id;
  select institution_id into v_course_institution_id from public.academic_courses where id = p_course_id;
  if v_batch_institution_id is null or v_batch_institution_id <> v_institution_id
    or v_course_institution_id is null or v_course_institution_id <> v_institution_id then
    raise exception 'Course and batch must belong to your institution';
  end if;
  if v_role = 'faculty' and not public.auth_can_access_batch(p_batch_id) then
    raise exception 'You are not assigned to the selected batch';
  end if;

  select display_name into v_actor_name from public.profiles where id = v_actor_id;
  for i in 1..5 loop
    v_join_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (select 1 from public.classrooms where join_code = v_join_code);
  end loop;

  insert into public.classrooms (
    institution_id, course_id, batch_id, name, description, join_code, enrollment_mode, created_by
  ) values (
    v_institution_id, p_course_id, p_batch_id, btrim(p_name), coalesce(p_description, ''),
    v_join_code, coalesce(p_enrollment_mode, 'join_code'), v_actor_id
  ) returning id into v_classroom_id;

  insert into public.classroom_faculty (
    classroom_id, faculty_id, faculty_display_name, is_primary
  ) values (v_classroom_id, v_actor_id, coalesce(v_actor_name, ''), true);

  insert into public.audit_logs (institution_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_institution_id, v_actor_id, 'classroom.created', 'classroom', v_classroom_id::text,
    jsonb_build_object('batch_id', p_batch_id, 'course_id', p_course_id));

  return v_classroom_id;
end;
$$;

create or replace function public.join_classroom(p_join_code text)
returns jsonb
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_institution_id uuid := public.auth_institution_id();
  v_classroom public.classrooms%rowtype;
  v_existing_status public.classroom_membership_status;
  v_status public.classroom_membership_status;
begin
  if v_actor_id is null or v_institution_id is null
    or public.auth_role() is distinct from 'student'::public.user_role then
    raise exception 'Only authenticated students can join a classroom';
  end if;

  select * into v_classroom
  from public.classrooms
  where join_code = upper(btrim(coalesce(p_join_code, '')))
    and institution_id = v_institution_id
    and is_archived = false;
  if not found then
    raise exception 'No active classroom found for that join code';
  end if;

  if not public.auth_student_in_batch(v_classroom.batch_id) then
    raise exception 'You are not authorized for this classroom batch';
  end if;
  if v_classroom.enrollment_mode = 'faculty_managed' then
    raise exception 'This classroom requires faculty enrollment';
  end if;

  select status into v_existing_status
  from public.classroom_memberships
  where classroom_id = v_classroom.id and profile_id = v_actor_id;

  if found and v_existing_status = 'active' then
    return jsonb_build_object('classroom_id', v_classroom.id, 'status', 'active', 'already_joined', true);
  end if;
  if found and v_existing_status = 'removed' then
    raise exception 'Contact the classroom faculty before rejoining';
  end if;

  v_status := case when v_classroom.enrollment_mode = 'approval' then 'pending' else 'active' end;
  if found then
    update public.classroom_memberships
    set status = v_status, joined_at = now(), left_at = null
    where classroom_id = v_classroom.id and profile_id = v_actor_id;
  else
    insert into public.classroom_memberships (classroom_id, profile_id, status)
    values (v_classroom.id, v_actor_id, v_status);
  end if;

  insert into public.notifications (profile_id, institution_id, title, body, link_path)
  select cf.faculty_id, v_institution_id,
    case when v_status = 'active' then 'Student joined classroom' else 'Student requested to join' end,
    (select display_name from public.profiles where id = v_actor_id) || ' joined ' || v_classroom.name,
    '/classrooms/' || v_classroom.id::text
  from public.classroom_faculty cf
  where cf.classroom_id = v_classroom.id and cf.revoked_at is null;

  insert into public.audit_logs (institution_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_institution_id, v_actor_id, 'classroom.joined', 'classroom', v_classroom.id::text,
    jsonb_build_object('status', v_status));

  return jsonb_build_object('classroom_id', v_classroom.id, 'status', v_status, 'already_joined', false);
end;
$$;

create or replace function public.publish_classroom_announcement(
  p_classroom_id uuid,
  p_title text,
  p_body text
) returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_classroom public.classrooms%rowtype;
  v_actor_name text;
  v_announcement_id uuid;
begin
  select * into v_classroom from public.classrooms where id = p_classroom_id and is_archived = false;
  if not found then raise exception 'Classroom not found'; end if;
  if not public.auth_is_classroom_faculty(p_classroom_id)
    and not (public.auth_role() = 'admin' and v_classroom.institution_id = public.auth_institution_id()) then
    raise exception 'You are not authorized to post in this classroom';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 180
    or char_length(btrim(coalesce(p_body, ''))) not between 1 and 10000 then
    raise exception 'Announcement title or body is invalid';
  end if;

  select display_name into v_actor_name from public.profiles where id = v_actor_id;
  insert into public.announcements (classroom_id, author_id, author_display_name, title, body)
  values (p_classroom_id, v_actor_id, coalesce(v_actor_name, ''), btrim(p_title), btrim(p_body))
  returning id into v_announcement_id;

  insert into public.notifications (profile_id, institution_id, title, body, link_path)
  select cm.profile_id, v_classroom.institution_id, 'New classroom announcement: ' || btrim(p_title),
    btrim(p_body), '/classrooms/' || p_classroom_id::text
  from public.classroom_memberships cm
  where cm.classroom_id = p_classroom_id and cm.status = 'active';

  insert into public.audit_logs (institution_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_classroom.institution_id, v_actor_id, 'classroom.announcement_published', 'announcement',
    v_announcement_id::text, jsonb_build_object('classroom_id', p_classroom_id));
  return v_announcement_id;
end;
$$;

create or replace function public.create_classroom_assignment(
  p_classroom_id uuid,
  p_title text,
  p_description text,
  p_deadline timestamptz
) returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_classroom public.classrooms%rowtype;
  v_assignment_id uuid;
begin
  select * into v_classroom from public.classrooms where id = p_classroom_id and is_archived = false;
  if not found then raise exception 'Classroom not found'; end if;
  if not public.auth_is_classroom_faculty(p_classroom_id)
    and not (public.auth_role() = 'admin' and v_classroom.institution_id = public.auth_institution_id()) then
    raise exception 'You are not authorized to create an assignment in this classroom';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 180
    or char_length(coalesce(p_description, '')) > 10000 then
    raise exception 'Assignment title or description is invalid';
  end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'Assignment deadline must be in the future';
  end if;

  insert into public.assignments (
    batch_id, classroom_id, created_by, title, description, state, mode, deadline, published_at
  ) values (
    v_classroom.batch_id, p_classroom_id, v_actor_id, btrim(p_title), coalesce(p_description, ''),
    'published', 'individual', p_deadline, now()
  ) returning id into v_assignment_id;

  insert into public.notifications (profile_id, institution_id, title, body, link_path)
  select cm.profile_id, v_classroom.institution_id, 'New assignment: ' || btrim(p_title),
    'Due ' || to_char(p_deadline at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI'),
    '/classrooms/' || p_classroom_id::text
  from public.classroom_memberships cm
  where cm.classroom_id = p_classroom_id and cm.status = 'active';

  insert into public.audit_logs (institution_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_classroom.institution_id, v_actor_id, 'classroom.assignment_published', 'assignment',
    v_assignment_id::text, jsonb_build_object('classroom_id', p_classroom_id));
  return v_assignment_id;
end;
$$;

revoke all on function public.create_classroom(text, uuid, uuid, text, public.classroom_enrollment_mode) from public, anon;
revoke all on function public.join_classroom(text) from public, anon;
revoke all on function public.publish_classroom_announcement(uuid, text, text) from public, anon;
revoke all on function public.create_classroom_assignment(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.create_classroom(text, uuid, uuid, text, public.classroom_enrollment_mode) to authenticated;
grant execute on function public.join_classroom(text) to authenticated;
grant execute on function public.publish_classroom_announcement(uuid, text, text) to authenticated;
grant execute on function public.create_classroom_assignment(uuid, text, text, timestamptz) to authenticated;

-- Realtime sends only RLS-authorized rows; clients use the events as a signal
-- to invalidate and refetch database-backed React Query records.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classroom_memberships') then
      alter publication supabase_realtime add table public.classroom_memberships;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements') then
      alter publication supabase_realtime add table public.announcements;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'assignments') then
      alter publication supabase_realtime add table public.assignments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;
