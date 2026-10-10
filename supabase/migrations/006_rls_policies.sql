-- Migration 006: Row Level Security — all tables
-- DevAtlas Phase 2
-- Every table gets RLS enabled. Authorization enforced at the database layer.

-- ─── Helper: get caller's institution_id ──────────────────
create or replace function public.auth_institution_id()
returns uuid
language sql stable security definer
set search_path = public, auth
as $$
  select institution_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- ─── Helper: get caller's role in their institution ────────
create or replace function public.auth_role()
returns public.user_role
language sql stable security definer
set search_path = public, auth
as $$
  select role
  from public.role_assignments
  where profile_id = auth.uid()
    and institution_id = public.auth_institution_id()
    and revoked_at is null
  order by assigned_at desc
  limit 1;
$$;

-- ─── Helper: is faculty assigned to batch? ────────────────
create or replace function public.auth_can_access_batch(p_batch_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.faculty_batch_assignments
    where batch_id = p_batch_id
      and faculty_id = auth.uid()
      and revoked_at is null
  );
$$;

-- ─── Helper: is student in batch? ─────────────────────────
create or replace function public.auth_student_in_batch(p_batch_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.batch_memberships
    where batch_id = p_batch_id
      and profile_id = auth.uid()
      and is_active = true
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- IDENTITY TABLES
-- ═══════════════════════════════════════════════════════════

alter table public.institutions enable row level security;
create policy "institutions: read own" on public.institutions
  for select using (id = public.auth_institution_id());
create policy "institutions: admin manage" on public.institutions
  for all using (id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: faculty and admin read same institution" on public.profiles
  for select using (
    institution_id = public.auth_institution_id()
    and public.auth_role() in ('faculty', 'admin')
  );
create policy "profiles: insert on signup" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

alter table public.role_assignments enable row level security;
create policy "role_assignments: read own" on public.role_assignments
  for select using (profile_id = auth.uid());
create policy "role_assignments: admin manage" on public.role_assignments
  for all using (
    institution_id = public.auth_institution_id()
    and public.auth_role() = 'admin'
  );

alter table public.invitations enable row level security;
create policy "invitations: admin manage" on public.invitations
  for all using (
    institution_id = public.auth_institution_id()
    and public.auth_role() = 'admin'
  );
-- Anyone can read an invitation by token (acceptance flow validates token + expiry)
create policy "invitations: read by token" on public.invitations
  for select using (true);

-- ═══════════════════════════════════════════════════════════
-- ACADEMICS
-- ═══════════════════════════════════════════════════════════

alter table public.academic_courses enable row level security;
create policy "academic_courses: read same institution" on public.academic_courses
  for select using (institution_id = public.auth_institution_id());
create policy "academic_courses: admin manage" on public.academic_courses
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.academic_years enable row level security;
create policy "academic_years: read same institution" on public.academic_years
  for select using (institution_id = public.auth_institution_id());
create policy "academic_years: admin manage" on public.academic_years
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.academic_divisions enable row level security;
create policy "academic_divisions: read same institution" on public.academic_divisions
  for select using (institution_id = public.auth_institution_id());
create policy "academic_divisions: admin manage" on public.academic_divisions
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.academic_batches enable row level security;
create policy "academic_batches: read same institution" on public.academic_batches
  for select using (institution_id = public.auth_institution_id());
create policy "academic_batches: admin manage" on public.academic_batches
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

-- semesters has no institution_id — scope via batch → institution
alter table public.semesters enable row level security;
create policy "semesters: read via batch" on public.semesters
  for select using (
    exists (
      select 1 from public.academic_batches b
      where b.id = semesters.batch_id
        and b.institution_id = public.auth_institution_id()
    )
  );

alter table public.batch_memberships enable row level security;
create policy "batch_memberships: student reads own" on public.batch_memberships
  for select using (profile_id = auth.uid());
create policy "batch_memberships: faculty reads assigned batches" on public.batch_memberships
  for select using (
    public.auth_role() = 'faculty'
    and public.auth_can_access_batch(batch_id)
  );
create policy "batch_memberships: admin manages" on public.batch_memberships
  for all using (
    public.auth_role() = 'admin'
    and exists (
      select 1 from public.academic_batches b
      where b.id = batch_memberships.batch_id
        and b.institution_id = public.auth_institution_id()
    )
  );

alter table public.faculty_batch_assignments enable row level security;
create policy "faculty_batch_assignments: faculty reads own" on public.faculty_batch_assignments
  for select using (faculty_id = auth.uid());
create policy "faculty_batch_assignments: admin manages" on public.faculty_batch_assignments
  for all using (
    public.auth_role() = 'admin'
    and exists (
      select 1 from public.academic_batches b
      where b.id = faculty_batch_assignments.batch_id
        and b.institution_id = public.auth_institution_id()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- WORK TABLES
-- ═══════════════════════════════════════════════════════════

alter table public.projects enable row level security;
create policy "projects: student reads own" on public.projects
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.profile_id = auth.uid()
    )
  );
create policy "projects: faculty reads assigned batch" on public.projects
  for select using (
    public.auth_role() = 'faculty'
    and public.auth_can_access_batch(batch_id)
  );
create policy "projects: admin manages" on public.projects
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.project_members enable row level security;
create policy "project_members: read own project" on public.project_members
  for select using (profile_id = auth.uid());
create policy "project_members: faculty reads" on public.project_members
  for select using (
    public.auth_role() in ('faculty', 'admin')
    and exists (
      select 1 from public.projects p
      where p.id = project_members.project_id
        and p.institution_id = public.auth_institution_id()
    )
  );

alter table public.assignments enable row level security;
create policy "assignments: published visible to batch members" on public.assignments
  for select using (
    state = 'published'
    and (
      public.auth_student_in_batch(batch_id)
      or (public.auth_role() = 'faculty' and public.auth_can_access_batch(batch_id))
      or public.auth_role() = 'admin'
    )
  );
create policy "assignments: faculty manages assigned batches" on public.assignments
  for all using (
    public.auth_role() = 'faculty'
    and public.auth_can_access_batch(batch_id)
  );
create policy "assignments: admin manages all" on public.assignments
  for all using (
    public.auth_role() = 'admin'
    and exists (
      select 1 from public.academic_batches b
      where b.id = assignments.batch_id
        and b.institution_id = public.auth_institution_id()
    )
  );

alter table public.rubric_criteria enable row level security;
create policy "rubric_criteria: read via assignment" on public.rubric_criteria
  for select using (
    exists (
      select 1 from public.assignments a
      where a.id = rubric_criteria.assignment_id
        and (
          public.auth_student_in_batch(a.batch_id)
          or (public.auth_role() = 'faculty' and public.auth_can_access_batch(a.batch_id))
          or public.auth_role() = 'admin'
        )
    )
  );
create policy "rubric_criteria: faculty manages" on public.rubric_criteria
  for all using (
    exists (
      select 1 from public.assignments a
      where a.id = rubric_criteria.assignment_id
        and public.auth_role() = 'faculty'
        and public.auth_can_access_batch(a.batch_id)
    )
  );

alter table public.assignment_extensions enable row level security;
create policy "assignment_extensions: student reads own" on public.assignment_extensions
  for select using (profile_id = auth.uid());
create policy "assignment_extensions: faculty manages" on public.assignment_extensions
  for all using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_extensions.assignment_id
        and public.auth_role() = 'faculty'
        and public.auth_can_access_batch(a.batch_id)
    )
  );

alter table public.submissions enable row level security;
create policy "submissions: student reads own" on public.submissions
  for select using (profile_id = auth.uid());
create policy "submissions: student creates own" on public.submissions
  for insert with check (profile_id = auth.uid());
create policy "submissions: student updates own draft" on public.submissions
  for update using (profile_id = auth.uid() and state in ('not_started','draft'));
create policy "submissions: faculty reads assigned batch" on public.submissions
  for select using (
    public.auth_role() in ('faculty', 'admin')
    and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and (
          (public.auth_role() = 'faculty' and public.auth_can_access_batch(a.batch_id))
          or public.auth_role() = 'admin'
        )
    )
  );
create policy "submissions: faculty updates state" on public.submissions
  for update using (
    public.auth_role() = 'faculty'
    and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and public.auth_can_access_batch(a.batch_id)
    )
  );

alter table public.submission_versions enable row level security;
create policy "submission_versions: read via submission" on public.submission_versions
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_versions.submission_id
        and (
          s.profile_id = auth.uid()
          or public.auth_role() in ('faculty', 'admin')
        )
    )
  );

alter table public.evaluations enable row level security;
create policy "evaluations: student reads published own" on public.evaluations
  for select using (
    is_draft = false
    and exists (
      select 1 from public.submissions s
      where s.id = evaluations.submission_id and s.profile_id = auth.uid()
    )
  );
create policy "evaluations: faculty reads/writes assigned batch" on public.evaluations
  for all using (
    public.auth_role() = 'faculty'
    and exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = evaluations.submission_id
        and public.auth_can_access_batch(a.batch_id)
    )
  );

alter table public.criterion_results enable row level security;
create policy "criterion_results: read via evaluation" on public.criterion_results
  for select using (
    exists (
      select 1 from public.evaluations e
      join public.submissions s on s.id = e.submission_id
      where e.id = criterion_results.evaluation_id
        and (
          (s.profile_id = auth.uid() and e.is_draft = false)
          or public.auth_role() in ('faculty', 'admin')
        )
    )
  );
create policy "criterion_results: faculty manages" on public.criterion_results
  for all using (
    exists (
      select 1 from public.evaluations e
      join public.submissions s on s.id = e.submission_id
      join public.assignments a on a.id = s.assignment_id
      where e.id = criterion_results.evaluation_id
        and public.auth_role() = 'faculty'
        and public.auth_can_access_batch(a.batch_id)
    )
  );

alter table public.faculty_notes enable row level security;
-- Faculty notes are NEVER visible to students
create policy "faculty_notes: faculty reads own" on public.faculty_notes
  for select using (faculty_id = auth.uid());
create policy "faculty_notes: faculty manages own" on public.faculty_notes
  for all using (
    faculty_id = auth.uid()
    and institution_id = public.auth_institution_id()
  );

-- ═══════════════════════════════════════════════════════════
-- GITHUB TABLES
-- ═══════════════════════════════════════════════════════════

alter table public.github_accounts enable row level security;
create policy "github_accounts: student reads own" on public.github_accounts
  for select using (profile_id = auth.uid());
create policy "github_accounts: faculty reads same institution" on public.github_accounts
  for select using (
    public.auth_role() in ('faculty', 'admin')
    and institution_id = public.auth_institution_id()
  );
create policy "github_accounts: student manages own" on public.github_accounts
  for all using (profile_id = auth.uid() and institution_id = public.auth_institution_id());

alter table public.github_installations enable row level security;
create policy "github_installations: read same institution" on public.github_installations
  for select using (institution_id = public.auth_institution_id());
create policy "github_installations: admin manages" on public.github_installations
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.repositories enable row level security;
create policy "repositories: student reads own project" on public.repositories
  for select using (
    exists (
      select 1 from public.project_members pm
      join public.projects p on p.id = pm.project_id
      where p.id = repositories.project_id and pm.profile_id = auth.uid()
    )
  );
create policy "repositories: faculty reads assigned batch" on public.repositories
  for select using (
    public.auth_role() in ('faculty', 'admin')
    and exists (
      select 1 from public.projects p
      where p.id = repositories.project_id
        and (
          (public.auth_role() = 'faculty' and public.auth_can_access_batch(p.batch_id))
          or public.auth_role() = 'admin'
        )
    )
  );
create policy "repositories: faculty approves" on public.repositories
  for update using (
    public.auth_role() = 'faculty'
    and exists (
      select 1 from public.projects p
      where p.id = repositories.project_id
        and public.auth_can_access_batch(p.batch_id)
    )
  );

alter table public.commits enable row level security;
create policy "commits: read via approved repository" on public.commits
  for select using (
    exists (
      select 1 from public.repositories r
      where r.id = commits.repository_id
        and r.approval_state = 'approved'
        and (
          exists (
            select 1 from public.project_members pm
            join public.projects p on p.id = pm.project_id
            where p.id = r.project_id and pm.profile_id = auth.uid()
          )
          or (
            public.auth_role() = 'faculty'
            and exists (
              select 1 from public.projects p
              where p.id = r.project_id
                and public.auth_can_access_batch(p.batch_id)
            )
          )
          or public.auth_role() = 'admin'
        )
    )
  );

alter table public.commit_branch_refs enable row level security;
create policy "commit_branch_refs: read via commit" on public.commit_branch_refs
  for select using (
    exists (
      select 1 from public.commits c
      join public.repositories r on r.id = c.repository_id
      where c.id = commit_branch_refs.commit_id and r.approval_state = 'approved'
    )
  );

alter table public.pull_requests enable row level security;
create policy "pull_requests: read via approved repository" on public.pull_requests
  for select using (
    exists (
      select 1 from public.repositories r
      where r.id = pull_requests.repository_id and r.approval_state = 'approved'
    )
  );

alter table public.issues enable row level security;
create policy "issues: read via approved repository" on public.issues
  for select using (
    exists (
      select 1 from public.repositories r
      where r.id = issues.repository_id and r.approval_state = 'approved'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- DERIVED / OPS TABLES
-- ═══════════════════════════════════════════════════════════

alter table public.activity_policy_versions enable row level security;
create policy "activity_policy_versions: read same institution" on public.activity_policy_versions
  for select using (institution_id = public.auth_institution_id());
create policy "activity_policy_versions: admin manages" on public.activity_policy_versions
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

alter table public.student_daily_activity enable row level security;
create policy "student_daily_activity: student reads own" on public.student_daily_activity
  for select using (profile_id = auth.uid());
create policy "student_daily_activity: faculty reads same institution" on public.student_daily_activity
  for select using (
    institution_id = public.auth_institution_id()
    and public.auth_role() in ('faculty', 'admin')
  );

alter table public.student_streaks enable row level security;
create policy "student_streaks: student reads own" on public.student_streaks
  for select using (profile_id = auth.uid());
create policy "student_streaks: faculty reads same institution" on public.student_streaks
  for select using (
    institution_id = public.auth_institution_id()
    and public.auth_role() in ('faculty', 'admin')
  );

alter table public.milestone_definitions enable row level security;
create policy "milestone_definitions: read same institution" on public.milestone_definitions
  for select using (institution_id = public.auth_institution_id());
create policy "milestone_definitions: admin manages" on public.milestone_definitions
  for all using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

-- milestone_awards has no institution_id — scope via milestone_definitions join
alter table public.milestone_awards enable row level security;
create policy "milestone_awards: student reads own" on public.milestone_awards
  for select using (profile_id = auth.uid());
create policy "milestone_awards: faculty reads same institution" on public.milestone_awards
  for select using (
    public.auth_role() in ('faculty', 'admin')
    and exists (
      select 1 from public.milestone_definitions md
      where md.id = milestone_awards.milestone_id
        and md.institution_id = public.auth_institution_id()
    )
  );

-- webhook_receipts: only service role — no client-accessible policies
alter table public.webhook_receipts enable row level security;

-- sync_jobs: admin can read
alter table public.sync_jobs enable row level security;
create policy "sync_jobs: admin reads" on public.sync_jobs
  for select using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');

-- notifications: users read/update their own
alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications
  for select using (profile_id = auth.uid());
create policy "notifications: mark read" on public.notifications
  for update using (profile_id = auth.uid());

-- audit_logs: admin reads; insert only via service role
alter table public.audit_logs enable row level security;
create policy "audit_logs: admin reads own institution" on public.audit_logs
  for select using (institution_id = public.auth_institution_id() and public.auth_role() = 'admin');
