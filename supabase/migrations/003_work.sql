-- Migration 003: Work — projects, assignments, submissions, evidence, evaluations
-- DevAtlas Phase 2

-- ─── Projects ─────────────────────────────────────────────
create type public.project_type as enum ('individual', 'team');

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  batch_id        uuid not null references public.academic_batches(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  type            public.project_type not null default 'individual',
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index projects_batch_idx on public.projects(batch_id);
create index projects_institution_idx on public.projects(institution_id);

-- ─── Project members ──────────────────────────────────────
create table public.project_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at       date not null default current_date,
  left_at         date,
  unique (project_id, profile_id)
);

create index project_members_profile_idx on public.project_members(profile_id);

-- ─── Assignments ──────────────────────────────────────────
create type public.assignment_state as enum ('draft', 'published', 'closed');
create type public.assignment_mode  as enum ('individual', 'team');

create table public.assignments (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.academic_batches(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  title           text not null,
  description     text not null default '',
  state           public.assignment_state not null default 'draft',
  mode            public.assignment_mode not null default 'individual',
  deadline        timestamptz not null,
  timezone        text not null default 'Asia/Kolkata',
  late_policy     text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index assignments_batch_idx on public.assignments(batch_id);

-- ─── Rubric criteria ──────────────────────────────────────
create table public.rubric_criteria (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  label           text not null,
  description     text not null default '',
  max_points      int not null default 25,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index rubric_criteria_assignment_idx on public.rubric_criteria(assignment_id);

-- ─── Assignment extensions (per-student deadline) ─────────
create table public.assignment_extensions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  extended_deadline timestamptz not null,
  reason          text,
  granted_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (assignment_id, profile_id)
);

-- ─── Submissions ──────────────────────────────────────────
create type public.submission_state as enum (
  'not_started', 'draft', 'submitted', 'needs_revision', 'reviewed'
);

create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  state           public.submission_state not null default 'not_started',
  repository_id   uuid,  -- FK to repositories added in migration 004
  commit_sha      text,
  pr_url          text,
  summary         text,
  demo_url        text,
  reflection      text,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (assignment_id, profile_id)
);

create index submissions_assignment_idx on public.submissions(assignment_id);
create index submissions_profile_idx   on public.submissions(profile_id);

-- ─── Submission versions (immutable history) ──────────────
create table public.submission_versions (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references public.submissions(id) on delete cascade,
  version_number  int not null,
  commit_sha      text,
  summary         text,
  submitted_at    timestamptz not null default now()
);

create index submission_versions_submission_idx on public.submission_versions(submission_id);

-- ─── Evaluations ──────────────────────────────────────────
create table public.evaluations (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references public.submissions(id) on delete cascade,
  faculty_id      uuid not null references public.profiles(id),
  is_draft        boolean not null default true,
  feedback        text not null default '',
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (submission_id)
);

-- ─── Criterion results ────────────────────────────────────
create table public.criterion_results (
  id              uuid primary key default gen_random_uuid(),
  evaluation_id   uuid not null references public.evaluations(id) on delete cascade,
  criterion_id    uuid not null references public.rubric_criteria(id) on delete cascade,
  score           int not null default 0,
  comment         text,
  unique (evaluation_id, criterion_id)
);

-- ─── Faculty notes (private, not visible to students) ─────
create table public.faculty_notes (
  id              uuid primary key default gen_random_uuid(),
  faculty_id      uuid not null references public.profiles(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  content         text not null default '',
  updated_at      timestamptz not null default now(),
  unique (faculty_id, student_id)
);

-- triggers
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();
create trigger evaluations_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();
create trigger faculty_notes_updated_at before update on public.faculty_notes
  for each row execute function public.set_updated_at();
