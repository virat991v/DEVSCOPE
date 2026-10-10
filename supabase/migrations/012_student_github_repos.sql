-- Migration 012: student_github_repos staging table
--
-- Holds the full list of a student's GitHub repositories discovered during
-- OAuth sync. Faculty can approve specific repos to be linked to projects.
-- Once approved, the repo moves into the canonical `repositories` table.
--
-- RLS:
--   - A student can SELECT / DELETE their own rows.
--   - INSERT / UPDATE via service_role only (github-sync Edge Function).
--   - Faculty in the same institution can SELECT (for the approval flow).

create table public.student_github_repos (
  id                uuid        primary key default gen_random_uuid(),
  profile_id        uuid        not null references public.profiles(id) on delete cascade,

  -- GitHub's stable numeric repo ID stored as text
  github_repo_id    text        not null,

  -- Owner login (user or org) and names
  owner             text        not null,
  name              text        not null,
  full_name         text        not null,

  -- Metadata
  is_private        boolean     not null default false,
  html_url          text        not null,
  description       text,
  default_branch    text        not null default 'main',
  language          text,

  -- Timestamps from GitHub (stored as text ISO-8601 strings)
  github_updated_at timestamptz,
  github_pushed_at  timestamptz,

  -- When this row was last written by the sync function
  synced_at         timestamptz not null default now(),

  -- Prevent duplicates per student
  unique (profile_id, github_repo_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

create index student_github_repos_profile_idx
  on public.student_github_repos (profile_id);

-- ── Row-level security ─────────────────────────────────────────────────────

alter table public.student_github_repos enable row level security;

-- Students can read and delete their own repo list
create policy "student_github_repos: owner select"
  on public.student_github_repos for select
  using (profile_id = auth.uid());

create policy "student_github_repos: owner delete"
  on public.student_github_repos for delete
  using (profile_id = auth.uid());

-- Faculty in the same institution can read (for approval workflow)
create policy "student_github_repos: faculty select"
  on public.student_github_repos for select
  using (
    exists (
      select 1
      from public.role_assignments ra
      join public.profiles          sp on sp.id = student_github_repos.profile_id
      where ra.profile_id    = auth.uid()
        and ra.role           = 'faculty'
        and ra.institution_id = sp.institution_id
        and ra.revoked_at     is null
    )
  );

-- service_role bypasses RLS by default (INSERT / UPDATE from Edge Functions)
