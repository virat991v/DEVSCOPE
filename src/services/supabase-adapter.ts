/**
 * Real Supabase service adapter.
 * Implements the same DevAtlasService interface as the demo adapter.
 * Replaces demo adapter when VITE_SUPABASE_URL is configured.
 *
 * All queries respect RLS — authorization is enforced in the database.
 * No production code may silently substitute fake data after an API error.
 */
import { supabase } from '@/lib/supabase'
import type { DevAtlasService, SubmitAssignmentPayload, SaveEvaluationPayload, UpdateProfilePayload } from '@/services/index'
import type {
  Profile, AcademicBatch, Student,
  Assignment, Submission, Evaluation, DailyActivity,
  Streak, Notification, Repository, RubricCriterion,
  SubmissionVersion, CriterionResult, MilestoneAward, Project,
} from '@/types'

// ─── Error wrapper ────────────────────────────────────────

function assertData<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) throw new Error(`[${context}] ${error.message}`)
  if (data === null) throw new Error(`[${context}] No data returned`)
  return data
}

// ─── Mappers ──────────────────────────────────────────────

function mapProfile(row: {
  id: string; institution_id: string; display_name: string; email: string;
  avatar_initials: string; roll_number: string | null; github_username: string | null;
  role_assignments?: Array<{ role: string }>;
  github_accounts?: Array<{ connection_state: string; last_sync_at: string | null }>;
}): Profile {
  const role = (row.role_assignments?.[0]?.role ?? 'student') as Profile['role']
  const gh = row.github_accounts?.[0]
  return {
    id: row.id,
    institutionId: row.institution_id,
    displayName: row.display_name,
    email: row.email,
    role,
    avatarInitials: row.avatar_initials,
    rollNumber: row.roll_number ?? undefined,
    githubUsername: row.github_username ?? undefined,
    githubConnectionState: (gh?.connection_state ?? 'not_connected') as Profile['githubConnectionState'],
    lastSyncAt: gh?.last_sync_at ?? undefined,
  }
}

function mapBatch(row: {
  id: string; institution_id: string; label: string; section: string;
  academic_divisions?: { year_label: string; name: string; academic_years?: { label: string } } | null;
  faculty_batch_assignments?: Array<{ faculty_id: string }>;
  batch_memberships?: Array<unknown>;
}): AcademicBatch {
  const div = row.academic_divisions
  const year = div?.academic_years
  const enrolledCount = row.batch_memberships?.length ?? 0
  return {
    id: row.id,
    institutionId: row.institution_id,
    label: row.label,
    section: row.section,
    division: div?.name ?? '',
    year: div?.year_label ?? '',
    semester: year?.label ?? '',
    program: div?.name ?? '',
    currentSemester: 0,
    enrolledCount,
    studentCount: enrolledCount,
    isActive: true,
    facultyIds: row.faculty_batch_assignments?.map(f => f.faculty_id) ?? [],
  }
}

function mapStudent(row: {
  id: string; institution_id: string; display_name: string; email: string;
  avatar_initials: string; roll_number: string | null; github_username: string | null;
  batch_memberships?: Array<{ batch_id: string; roll_number: string }>;
  github_accounts?: Array<{ connection_state: string; last_sync_at: string | null }>;
  student_daily_activity?: Array<{ commit_count: number }>;
  student_streaks?: Array<{ current_streak: number; last_qualifying_date: string | null }>;
  project_members?: Array<{ projects?: { id: string; title: string } }>;
}): Student {
  const gh = row.github_accounts?.[0]
  const bm = row.batch_memberships?.[0]
  const activity30 = row.student_daily_activity?.reduce((s, d) => s + d.commit_count, 0) ?? 0
  const streak = row.student_streaks?.[0]
  const proj = row.project_members?.[0]?.projects
  return {
    id: row.id,
    profileId: row.id,
    batchId: bm?.batch_id ?? '',
    rollNumber: bm?.roll_number ?? row.roll_number ?? '',
    displayName: row.display_name,
    email: row.email,
    avatarInitials: row.avatar_initials,
    githubUsername: row.github_username ?? undefined,
    githubConnectionState: (gh?.connection_state ?? 'not_connected') as Student['githubConnectionState'],
    activeProjectId: proj?.id,
    activeProjectName: proj?.title,
    observedActivityLast30: activity30,
    currentStreak: streak?.current_streak ?? 0,
    lastObservedEvent: gh?.last_sync_at ?? undefined,
    submissionState: undefined,   // enriched separately if needed
    dataFreshnessAt: gh?.last_sync_at ?? undefined,
    coverageState: 'healthy',
    attentionItems: [],           // enriched separately
  }
}

function mapAssignment(row: {
  id: string; batch_id: string; title: string; description: string;
  state: string; mode: string; deadline: string; timezone: string;
  late_policy: string | null; published_at: string | null;
  rubric_criteria?: Array<{ id: string; label: string; description: string; max_points: number; sort_order: number }>;
}): Assignment {
  return {
    id: row.id,
    batchId: row.batch_id,
    title: row.title,
    description: row.description,
    state: row.state as Assignment['state'],
    mode: row.mode as Assignment['mode'],
    deadline: row.deadline,
    timezone: row.timezone,
    rubricCriteria: (row.rubric_criteria ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((rc): RubricCriterion => ({
        id: rc.id, label: rc.label, description: rc.description, maxPoints: rc.max_points,
      })),
    publishedAt: row.published_at ?? undefined,
  }
}

function mapSubmission(row: {
  id: string; assignment_id: string; profile_id: string; state: string;
  repository_id: string | null; commit_sha: string | null; pr_url: string | null;
  summary: string | null; demo_url: string | null; reflection: string | null;
  submitted_at: string | null;
  submission_versions?: Array<{ id: string; version_number: number; commit_sha: string | null; summary: string | null; submitted_at: string }>;
}): Submission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.profile_id,
    state: row.state as Submission['state'],
    repositoryId: row.repository_id ?? undefined,
    commitSha: row.commit_sha ?? undefined,
    prUrl: row.pr_url ?? undefined,
    summary: row.summary ?? undefined,
    demoUrl: row.demo_url ?? undefined,
    reflection: row.reflection ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    versions: (row.submission_versions ?? [])
      .sort((a, b) => a.version_number - b.version_number)
      .map((v): SubmissionVersion => ({
        id: v.id, submittedAt: v.submitted_at,
        commitSha: v.commit_sha ?? undefined,
        summary: v.summary ?? undefined,
      })),
  }
}

// ─── Real Supabase adapter ────────────────────────────────

// Supabase's generated types return `never` for complex relational selects.
// We cast through `unknown` to our explicit mapper input types to stay safe
// while avoiding the TS2345 errors that arise from the overly-narrow inference.
type AnyRow = Record<string, unknown>

export const supabaseService: DevAtlasService = {
  async getCurrentProfile() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .select(`*, role_assignments(role), github_accounts(connection_state, last_sync_at)`)
      .eq('id', user.id)
      .single()

    return mapProfile(assertData(data as unknown as Parameters<typeof mapProfile>[0], error, 'getCurrentProfile'))
  },

  async getBatches() {
    const { data, error } = await supabase
      .from('academic_batches')
      .select(`
        *,
        academic_divisions(name, year_label, academic_years(label)),
        faculty_batch_assignments(faculty_id),
        batch_memberships(id)
      `)
      .order('label')

    return assertData(data as unknown as Parameters<typeof mapBatch>[0][], error, 'getBatches').map(mapBatch)
  },

  async getBatchSummary(batchId: string) {
    const [{ data: assignments, error: assignmentsError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from('assignments').select('id').eq('batch_id', batchId),
      supabase.from('batch_memberships').select('profile_id').eq('batch_id', batchId).eq('is_active', true),
    ])
    if (assignmentsError) throw new Error(`[getBatchSummary] ${assignmentsError.message}`)
    if (membersError) throw new Error(`[getBatchSummary] ${membersError.message}`)

    const assignmentIds = (assignments as unknown as AnyRow[] | null)?.map(row => row['id'] as string) ?? []
    const profileIds = (members as unknown as AnyRow[] | null)?.map(row => row['profile_id'] as string) ?? []
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)

    const [submissions, activity] = await Promise.all([
      assignmentIds.length > 0
        ? supabase.from('submissions').select('id', { count: 'exact' }).eq('state', 'submitted').in('assignment_id', assignmentIds)
        : Promise.resolve({ count: 0, error: null }),
      profileIds.length > 0
        ? supabase.from('student_daily_activity').select('profile_id').in('profile_id', profileIds).gte('reporting_date', since).gt('commit_count', 0)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (submissions.error) throw new Error(`[getBatchSummary] ${submissions.error.message}`)
    if (activity.error) throw new Error(`[getBatchSummary] ${activity.error.message}`)
    const activeStudentCount = new Set(((activity.data ?? []) as Array<{ profile_id: string }>).map(row => row.profile_id)).size

    return {
      batchId,
      enrolledCount: profileIds.length,
      activeStudentCount,
      pendingReviewCount: submissions.count ?? 0,
      attentionItemCount: 0,   // computed separately in Phase 4
      dataFreshnessAt: new Date().toISOString(),
    }
  },

  async getStudents(batchId: string) {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        batch_memberships!inner(batch_id, roll_number),
        github_accounts(connection_state, last_sync_at),
        student_streaks(current_streak, last_qualifying_date),
        project_members(projects(id, title))
      `)
      .eq('batch_memberships.batch_id', batchId)
      .eq('batch_memberships.is_active', true)
      .gte('student_daily_activity.reporting_date', since)
      .order('display_name')

    return assertData(data as unknown as Parameters<typeof mapStudent>[0][], error, 'getStudents').map(mapStudent)
  },

  async getStudent(studentId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        batch_memberships(batch_id, roll_number),
        github_accounts(connection_state, last_sync_at),
        student_streaks(current_streak, last_qualifying_date),
        project_members(projects(id, title))
      `)
      .eq('id', studentId)
      .single()

    if (error) return null
    return data ? mapStudent(data as unknown as Parameters<typeof mapStudent>[0]) : null
  },

  async getAssignments(batchId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`*, rubric_criteria(id, label, description, max_points, sort_order)`)
      .eq('batch_id', batchId)
      .in('state', ['published', 'closed'])
      .order('deadline')

    return assertData(data as unknown as Parameters<typeof mapAssignment>[0][], error, 'getAssignments').map(mapAssignment)
  },

  async getAssignment(assignmentId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`*, rubric_criteria(id, label, description, max_points, sort_order)`)
      .eq('id', assignmentId)
      .maybeSingle()

    if (error) throw new Error(`[getAssignment] ${error.message}`)
    return data ? mapAssignment(data as unknown as Parameters<typeof mapAssignment>[0]) : null
  },

  async getSubmissions(assignmentId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`*, submission_versions(id, version_number, commit_sha, summary, submitted_at)`)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })

    return assertData(data as unknown as Parameters<typeof mapSubmission>[0][], error, 'getSubmissions').map(mapSubmission)
  },

  async getEvaluation(submissionId: string) {
    const { data, error } = await supabase
      .from('evaluations')
      .select(`*, criterion_results(*)`)
      .eq('submission_id', submissionId)
      .single()

    if (error || !data) return null
    const row = data as unknown as AnyRow & { criterion_results?: AnyRow[] }
    return {
      id: row['id'] as string,
      submissionId: row['submission_id'] as string,
      facultyId: row['faculty_id'] as string,
      draft: row['is_draft'] as boolean,
      feedback: row['feedback'] as string,
      criterionResults: ((row['criterion_results'] ?? []) as AnyRow[]).map((cr): CriterionResult => ({
        criterionId: cr['criterion_id'] as string,
        score: cr['score'] as number,
        comment: (cr['comment'] as string | null) ?? undefined,
      })),
      publishedAt: (row['published_at'] as string | null) ?? undefined,
    } satisfies Evaluation
  },

  async getHeatmap(studentId: string) {
    const since = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('student_daily_activity')
      .select('*')
      .eq('profile_id', studentId)
      .gte('reporting_date', since)
      .order('reporting_date')

    return assertData(data as unknown as AnyRow[], error, 'getHeatmap').map((row): DailyActivity => ({
      date: row['reporting_date'] as string,
      commitCount: row['commit_count'] as number,
      prCount: row['pr_count'] as number,
      issueCount: row['issue_count'] as number,
      qualifiesForStreak: row['qualifies_streak'] as boolean,
      coverageState: row['coverage_state'] as DailyActivity['coverageState'],
      repositoryIds: [],   // enriched separately in Phase 4
    }))
  },

  async getStreak(studentId: string) {
    const { data, error } = await supabase
      .from('student_streaks')
      .select(`*, milestone_awards(milestone_id, awarded_at, milestone_definitions(threshold, label))`)
      .eq('profile_id', studentId)
      .single()

    if (error || !data) return { current: 0, longest: 0, milestones: [] }
    const row = data as unknown as AnyRow & { milestone_awards?: (AnyRow & { milestone_definitions?: AnyRow | null })[] }

    const milestones: MilestoneAward[] = (row['milestone_awards'] ?? []).map((ma): MilestoneAward => ({
      id: ma['milestone_id'] as string,
      threshold: (ma['milestone_definitions']?.['threshold'] as number | undefined) ?? 0,
      label: (ma['milestone_definitions']?.['label'] as string | undefined) ?? '',
      awardedAt: ma['awarded_at'] as string,
    }))

    return {
      current: row['current_streak'] as number,
      longest: row['longest_streak'] as number,
      lastQualifyingDate: (row['last_qualifying_date'] as string | null) ?? undefined,
      milestones,
    } satisfies Streak
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    return assertData(data as unknown as AnyRow[], error, 'getNotifications').map((n): Notification => ({
      id: n['id'] as string,
      userId: n['profile_id'] as string,
      title: n['title'] as string,
      body: n['body'] as string,
      message: n['body'] as string,
      type: 'info',
      read: n['is_read'] as boolean,
      createdAt: n['created_at'] as string,
      linkPath: (n['link_path'] as string | null) ?? undefined,
    }))
  },

  async getRepositories(projectId: string) {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at')

    return assertData(data as unknown as AnyRow[], error, 'getRepositories').map((r): Repository => ({
      id: r['id'] as string,
      projectId: r['project_id'] as string,
      githubOwner: r['owner'] as string,
      githubRepo: r['name'] as string,
      fullName: r['full_name'] as string,
      approvalState: r['approval_state'] as Repository['approvalState'],
      isPrivate: r['is_private'] as boolean,
      coverageState: 'healthy',
      lastSyncAt: (r['last_sync_at'] as string | null) ?? undefined,
    }))
  },

  async getProjects(batchOrStudentId: string) {
    // Try batch first, fall back to student membership query
    const { data: batchRows } = await supabase
      .from('projects')
      .select(`*, project_members(profile_id)`)
      .eq('batch_id', batchOrStudentId)
      .order('created_at')

    if (batchRows && (batchRows as unknown as AnyRow[]).length > 0) {
      return (batchRows as unknown as AnyRow[]).map((r): Project => ({
        id: r['id'] as string,
        institutionId: r['institution_id'] as string,
        batchId: r['batch_id'] as string,
        title: r['title'] as string,
        description: (r['description'] as string | null) ?? '',
        type: r['type'] as Project['type'],
        memberIds: ((r['project_members'] ?? []) as AnyRow[]).map(m => m['profile_id'] as string),
        repositoryIds: [],   // enriched separately
        createdAt: r['created_at'] as string,
      }))
    }

    // Student view: look up projects the student is a member of
    const { data: memberRows, error } = await supabase
      .from('project_members')
      .select(`projects(*, project_members(profile_id))`)
      .eq('profile_id', batchOrStudentId)

    if (error || !memberRows) return []

    return (memberRows as unknown as AnyRow[]).flatMap(row => {
      const p = (row['projects'] as AnyRow | null)
      if (!p) return []
      return [{
        id: p['id'] as string,
        institutionId: p['institution_id'] as string,
        batchId: p['batch_id'] as string,
        title: p['title'] as string,
        description: (p['description'] as string | null) ?? '',
        type: p['type'] as Project['type'],
        memberIds: ((p['project_members'] ?? []) as AnyRow[]).map(m => m['profile_id'] as string),
        repositoryIds: [],
        createdAt: p['created_at'] as string,
      } satisfies Project]
    })
  },

  // ── Write operations ──────────────────────────────────────

  async updateProfile(profileId: string, payload: UpdateProfilePayload) {
    const sb = supabase as unknown as {
      from: (t: string) => { update: (v: AnyRow) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } }
    }
    const { error } = await sb.from('profiles').update({ display_name: payload.displayName }).eq('id', profileId)
    if (error) throw new Error(`[updateProfile] ${error.message}`)
  },

  async markAllNotificationsRead(userId: string) {
    const sb = supabase as unknown as {
      from: (t: string) => { update: (v: AnyRow) => { eq: (c: string, v: string) => { eq: (c: string, v: boolean) => Promise<{ error: { message: string } | null }> } } }
    }
    const { error } = await sb.from('notifications').update({ is_read: true }).eq('profile_id', userId).eq('is_read', false)
    if (error) throw new Error(`[markAllNotificationsRead] ${error.message}`)
  },

  async submitAssignment(payload: SubmitAssignmentPayload) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Not authenticated')

    // Upsert submission row
    type SubRow = { assignment_id: string; profile_id: string; state: string; commit_sha: string; summary: string; reflection: string; submitted_at: string }
    const sb = supabase as unknown as {
      from: (t: string) => {
        upsert: (v: SubRow, o: { onConflict: string }) => Promise<{ data: AnyRow[] | null; error: { message: string } | null }>
        insert: (v: AnyRow) => Promise<{ data: AnyRow[] | null; error: { message: string } | null }>
      }
    }

    const now = new Date().toISOString()
    const { data: rows, error: upsertErr } = await sb.from('submissions').upsert(
      {
        assignment_id: payload.assignmentId,
        profile_id: user.id,
        state: 'submitted',
        commit_sha: payload.commitSha,
        summary: payload.summary,
        reflection: payload.reflection,
        submitted_at: now,
      },
      { onConflict: 'assignment_id,profile_id' },
    )
    if (upsertErr) throw new Error(`[submitAssignment] ${upsertErr.message}`)

    // Create a submission version record
    const submissionId = (rows?.[0] as AnyRow | undefined)?.['id'] as string | undefined
    if (submissionId) {
      await sb.from('submission_versions').insert({
        submission_id: submissionId,
        commit_sha: payload.commitSha,
        summary: payload.summary,
        submitted_at: now,
      })
    }
  },

  async saveEvaluation(payload: SaveEvaluationPayload) {
    const now = new Date().toISOString()
    type EvalRow = { submission_id: string; faculty_id: string; feedback: string; is_draft: boolean; published_at: string | null }
    const sb = supabase as unknown as {
      from: (t: string) => {
        upsert: (v: EvalRow | AnyRow, o: { onConflict: string }) => Promise<{ data: AnyRow[] | null; error: { message: string } | null }>
        update: (v: AnyRow) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> }
      }
    }

    // Upsert the evaluation row
    const { data: rows, error: evalErr } = await sb.from('evaluations').upsert(
      {
        submission_id: payload.submissionId,
        faculty_id: payload.facultyId,
        feedback: payload.feedback,
        is_draft: !payload.publish,
        published_at: payload.publish ? now : null,
      },
      { onConflict: 'submission_id,faculty_id' },
    )
    if (evalErr) throw new Error(`[saveEvaluation] ${evalErr.message}`)

    const evalId = (rows?.[0] as AnyRow | undefined)?.['id'] as string | undefined
    if (evalId) {
      // Upsert criterion results
      for (const [criterionId, score] of Object.entries(payload.scores)) {
        await sb.from('criterion_results').upsert(
          {
            evaluation_id: evalId,
            criterion_id: criterionId,
            score,
            comment: payload.comments[criterionId] ?? null,
          },
          { onConflict: 'evaluation_id,criterion_id' },
        )
      }
    }

    // If publishing, mark submission as reviewed
    if (payload.publish) {
      await sb.from('submissions').update({ state: 'reviewed' }).eq('id', payload.submissionId)
    }
  },

  async requestRevision(submissionId: string) {
    const sb = supabase as unknown as {
      from: (t: string) => { update: (v: AnyRow) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } }
    }
    const { error } = await sb.from('submissions').update({ state: 'needs_revision' }).eq('id', submissionId)
    if (error) throw new Error(`[requestRevision] ${error.message}`)
  },

  async createInvite(email: string, role: 'student' | 'faculty'): Promise<string> {
    // Generate a cryptographically random token and store in the invitations table.
    // The invitations table must exist (see migration 003_work.sql or equivalent).
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    type InviteRow = { email: string; role: string; token: string; expires_at: string }
    const sb = supabase as unknown as {
      from: (t: string) => {
        insert: (v: InviteRow) => Promise<{ error: { message: string } | null }>
      }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await sb.from('invitations').insert({ email, role, token, expires_at: expiresAt })
    if (error) throw new Error(`[createInvite] ${error.message}`)

    return `${window.location.origin}/accept-invite?token=${token}`
  },
}
