-- Migration 002: Academics — courses, years, divisions, batches, semesters, memberships
-- DevAtlas Phase 2

-- ─── Academic courses ─────────────────────────────────────
create table public.academic_courses (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  code            text not null,
  name            text not null,
  credits         int,
  created_at      timestamptz not null default now(),
  unique (institution_id, code)
);

-- ─── Academic years ───────────────────────────────────────
create table public.academic_years (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  label           text not null,  -- e.g. "2024-25"
  start_date      date not null,
  end_date        date not null,
  created_at      timestamptz not null default now(),
  unique (institution_id, label)
);

-- ─── Academic divisions ───────────────────────────────────
create table public.academic_divisions (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name            text not null,   -- e.g. "E", "Computer Science"
  year_label      text not null,   -- e.g. "2nd Year", "SE"
  created_at      timestamptz not null default now()
);

-- ─── Academic batches ─────────────────────────────────────
-- A batch is a specific section (e.g. SE-E-B).
-- Display label comes from config, not hard-coded logic.
create table public.academic_batches (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  division_id     uuid not null references public.academic_divisions(id) on delete cascade,
  label           text not null,      -- e.g. "SE-E-B"
  section         text not null,      -- e.g. "B"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (institution_id, label)
);

create index batches_institution_idx on public.academic_batches(institution_id);

-- ─── Semesters ────────────────────────────────────────────
create table public.semesters (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.academic_batches(id) on delete cascade,
  label           text not null,       -- e.g. "Sem IV"
  start_date      date not null,
  end_date        date not null,
  is_active       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ─── Batch memberships (students in batches) ──────────────
-- enrollment_start/end preserved for transfers and historical reports
create table public.batch_memberships (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.academic_batches(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  roll_number     text not null,
  enrollment_start date not null default current_date,
  enrollment_end   date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (batch_id, roll_number),
  unique (batch_id, profile_id)
);

create index batch_memberships_profile_idx on public.batch_memberships(profile_id);
create index batch_memberships_batch_idx on public.batch_memberships(batch_id);

-- ─── Faculty batch assignments ────────────────────────────
-- Faculty cannot access batches they are not assigned to.
create table public.faculty_batch_assignments (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.academic_batches(id) on delete cascade,
  faculty_id      uuid not null references public.profiles(id) on delete cascade,
  assigned_at     timestamptz not null default now(),
  revoked_at      timestamptz,
  unique (batch_id, faculty_id)
);

create index faculty_batch_assignments_faculty_idx on public.faculty_batch_assignments(faculty_id);

-- triggers
create trigger batches_updated_at before update on public.academic_batches
  for each row execute function public.set_updated_at();
