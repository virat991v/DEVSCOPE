/**
 * Deterministic demo data for DevAtlas Phase 1.
 * All counts are derived from the same fixture source so every screen agrees.
 * No real GitHub identities; no external image fetches.
 */
import type {
  Institution, Profile, AcademicBatch, Student,
  Assignment, Submission, Evaluation, DailyActivity,
  Streak, AttentionItem, BatchSummary, Notification,
  RubricCriterion, SubmissionVersion, CriterionResult, MilestoneAward,
  SubmissionState, Project,
} from '@/types'

// ─── Deterministic pseudo-random ──────────────────────────

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Institution ──────────────────────────────────────────

export const DEMO_INSTITUTION: Institution = {
  id: 'inst-1',
  name: 'Apex Institute of Technology',
  slug: 'apex',
  timezone: 'Asia/Kolkata',
}

// ─── Batches ──────────────────────────────────────────────

export const DEMO_BATCHES: AcademicBatch[] = [
  { id: 'b-se-e-a', institutionId: 'inst-1', label: 'SE-E-A', section: 'A', division: 'E', year: '2nd Year', semester: 'Sem IV', program: 'B.E. Computer Engineering', currentSemester: 4, enrolledCount: 60, studentCount: 60, isActive: true, facultyIds: ['fac-1', 'fac-2'] },
  { id: 'b-se-e-b', institutionId: 'inst-1', label: 'SE-E-B', section: 'B', division: 'E', year: '2nd Year', semester: 'Sem IV', program: 'B.E. Computer Engineering', currentSemester: 4, enrolledCount: 60, studentCount: 60, isActive: true, facultyIds: ['fac-1'] },
  { id: 'b-se-e-c', institutionId: 'inst-1', label: 'SE-E-C', section: 'C', division: 'E', year: '2nd Year', semester: 'Sem IV', program: 'B.E. Computer Engineering', currentSemester: 4, enrolledCount: 58, studentCount: 58, isActive: true, facultyIds: ['fac-2', 'fac-3'] },
  { id: 'b-te-e-a', institutionId: 'inst-1', label: 'TE-E-A', section: 'A', division: 'E', year: '3rd Year', semester: 'Sem VI', program: 'B.E. Computer Engineering', currentSemester: 6, enrolledCount: 62, studentCount: 62, isActive: true, facultyIds: ['fac-3'] },
  { id: 'b-te-e-b', institutionId: 'inst-1', label: 'TE-E-B', section: 'B', division: 'E', year: '3rd Year', semester: 'Sem VI', program: 'B.E. Computer Engineering', currentSemester: 6, enrolledCount: 60, studentCount: 60, isActive: false, facultyIds: ['fac-1', 'fac-3'] },
]

// ─── Faculty profiles ─────────────────────────────────────

export const DEMO_FACULTY: Profile[] = [
  { id: 'fac-1', institutionId: 'inst-1', displayName: 'Dr. Priya Sharma', email: 'priya.sharma@apex.edu', role: 'faculty', avatarInitials: 'PS', githubConnectionState: 'not_connected' },
  { id: 'fac-2', institutionId: 'inst-1', displayName: 'Prof. Rajan Mehta', email: 'rajan.mehta@apex.edu', role: 'faculty', avatarInitials: 'RM', githubConnectionState: 'not_connected' },
  { id: 'fac-3', institutionId: 'inst-1', displayName: 'Ms. Ananya Iyer', email: 'ananya.iyer@apex.edu', role: 'faculty', avatarInitials: 'AI', githubConnectionState: 'not_connected' },
]

export const DEMO_ADMIN: Profile = {
  id: 'adm-1', institutionId: 'inst-1', displayName: 'Admin User', email: 'admin@apex.edu', role: 'admin', avatarInitials: 'AU', githubConnectionState: 'not_connected',
}

// ─── Student generation ───────────────────────────────────

const FIRST_NAMES = ['Aarav','Aditi','Aditya','Akanksha','Akash','Ananya','Arjun','Aryan','Bhavna','Chetan','Deepa','Dhruv','Disha','Gaurav','Harini','Ishaan','Jayesh','Jyoti','Kabir','Kavita','Kiran','Komal','Lakshmi','Manish','Meera','Mihir','Mohan','Nandini','Nikhil','Nilufar','Omkar','Pallavi','Pooja','Prachi','Prakash','Pranav','Priya','Rahul','Raj','Riya','Rohit','Roshan','Sahil','Sanika','Sanjay','Sanya','Shruti','Sneha','Sujata','Suresh','Tanvi','Tejas','Uma','Varun','Vidya','Vikram','Vishwa','Yash','Zara','Zoya']
const LAST_NAMES  = ['Agarwal','Bhatt','Chavan','Dalvi','Desai','Deshpande','Gupta','Iyer','Joshi','Kaur','Khan','Kumar','Mehta','Mishra','Nair','Patil','Patel','Pillai','Rao','Reddy','Shah','Sharma','Shinde','Singh','Sinha','Suri','Thakur','Verma','Wani','Yadav']
const GH_SUFFIXES = ['dev','codes','io','42','x','hq','lab','0x','hack','bits']

const GH_STATES: Student['githubConnectionState'][] = [
  'healthy','healthy','healthy','healthy','degraded','not_connected','identity_connected','installation_pending','disconnected','healthy',
]
const COVERAGE_STATES: Student['coverageState'][] = [
  'healthy','healthy','healthy','healthy','pending_import','stale','disconnected','unavailable','healthy','healthy',
]
const SUBMISSION_STATES: Student['submissionState'][] = [
  'submitted','reviewed','needs_revision','not_started','draft','submitted','reviewed','submitted','not_started','submitted',
]

function generateStudents(): Student[] {
  const students: Student[] = []
  let idx = 0
  for (const batch of DEMO_BATCHES) {
    const rng = seeded(batch.id.charCodeAt(2) * 13 + 7)
    for (let i = 0; i < batch.enrolledCount; i++) {
      const fn = pick(FIRST_NAMES, rng)
      const ln = pick(LAST_NAMES, rng)
      const name = `${fn} ${ln}`
      const sid = `s-${batch.id}-${i + 1}`
      const ghState = GH_STATES[idx % GH_STATES.length]
      const covState = COVERAGE_STATES[idx % COVERAGE_STATES.length]
      const subState = SUBMISSION_STATES[idx % SUBMISSION_STATES.length]
      const activity = ghState === 'healthy' ? Math.floor(rng() * 28) + 2 : ghState === 'degraded' ? Math.floor(rng() * 8) : 0
      const streak   = ghState === 'healthy' ? Math.floor(rng() * 30) : 0
      const attentionItems: AttentionItem[] = []

      if (ghState === 'disconnected' || ghState === 'degraded') {
        attentionItems.push({
          id: `att-gh-${sid}`, studentId: sid,
          reason: 'github_broken', label: 'GitHub connection issue',
          detail: ghState === 'degraded' ? 'Sync degraded — last successful sync 3 days ago' : 'GitHub disconnected',
          severity: ghState === 'degraded' ? 'warning' : 'error', createdAt: '2024-10-04T09:00:00Z',
        })
      }
      if (subState === 'not_started' && idx % 7 === 0) {
        attentionItems.push({
          id: `att-sub-${sid}`, studentId: sid,
          reason: 'overdue_submission', label: 'Overdue submission',
          detail: 'Assignment 2 deadline passed 2 days ago',
          severity: 'error', createdAt: '2024-10-05T09:00:00Z',
        })
      }

      students.push({
        id: sid,
        profileId: `prof-${sid}`,
        batchId: batch.id,
        rollNumber: `${batch.label.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
        displayName: name,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@apex.edu`,
        avatarInitials: initials(name),
        githubUsername: ghState !== 'not_connected' ? `${fn.toLowerCase()}${pick(GH_SUFFIXES, rng)}` : undefined,
        githubConnectionState: ghState,
        activeProjectId: `proj-${batch.id}-${Math.ceil((i + 1) / 4)}`,
        activeProjectName: `Project ${Math.ceil((i + 1) / 4)}`,
        observedActivityLast30: activity,
        currentStreak: streak,
        lastObservedEvent: activity > 0 ? `2024-10-${String(Math.max(1, 7 - (idx % 7))).padStart(2, '0')}T14:30:00Z` : undefined,
        submissionState: subState,
        dataFreshnessAt: `2024-10-07T0${idx % 9}:00:00Z`,
        coverageState: covState,
        attentionItems,
      })
      idx++
    }
  }
  return students
}

export const DEMO_STUDENTS: Student[] = generateStudents()

// Helper: students by batch
export function studentsByBatch(batchId: string): Student[] {
  return DEMO_STUDENTS.filter(s => s.batchId === batchId)
}

// ─── Rubric criteria ──────────────────────────────────────

const RUBRIC: RubricCriterion[] = [
  { id: 'rc-1', label: 'Problem decomposition', description: 'Breaks the problem into clear, manageable sub-problems.', maxPoints: 25 },
  { id: 'rc-2', label: 'Code organisation', description: 'Files, functions, and naming are consistent and readable.', maxPoints: 25 },
  { id: 'rc-3', label: 'Evidence completeness', description: 'Submission links cover the expected scope of work.', maxPoints: 25 },
  { id: 'rc-4', label: 'Reflection quality', description: 'Reflection identifies specific learning and next steps.', maxPoints: 25 },
]

// ─── Assignments ──────────────────────────────────────────

export const DEMO_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asgn-1', batchId: 'b-se-e-b', title: 'Assignment 1 — CRUD Application',
    description: 'Build a basic CRUD application using a backend framework of your choice. Document the setup, API design, and data model.', state: 'published', mode: 'individual',
    deadline: '2024-09-28T23:59:00', timezone: 'Asia/Kolkata', rubricCriteria: RUBRIC, publishedAt: '2024-09-10T10:00:00Z',
  },
  {
    id: 'asgn-2', batchId: 'b-se-e-b', title: 'Assignment 2 — Authentication & Authorization',
    description: 'Add authentication to your Assignment 1 project. Implement role-based access control and document the security model.', state: 'published', mode: 'individual',
    deadline: '2024-10-05T23:59:00', timezone: 'Asia/Kolkata', rubricCriteria: RUBRIC, publishedAt: '2024-09-25T10:00:00Z',
  },
  {
    id: 'asgn-3', batchId: 'b-se-e-b', title: 'Assignment 3 — Team API Integration',
    description: 'In teams of 3–4, integrate a public API and present a working demo with test coverage.', state: 'draft', mode: 'team',
    deadline: '2024-10-20T23:59:00', timezone: 'Asia/Kolkata', rubricCriteria: RUBRIC,
  },
]

// ─── Submissions (for batch SE-E-B, assignment 1) ─────────

function makeSubmissions(): Submission[] {
  const subs: Submission[] = []
  const bStudents = studentsByBatch('b-se-e-b')
  const rng = seeded(42)
  bStudents.forEach((s, i) => {
    const states: SubmissionState[] = ['reviewed','submitted','needs_revision','not_started','submitted','reviewed']
    const state = states[i % states.length]
    const versions: SubmissionVersion[] = state !== 'not_started' ? [
      { id: `sv-${s.id}-1`, submittedAt: '2024-09-25T14:00:00Z', commitSha: `a${i}b${i}c${i}d` },
    ] : []
    if (state === 'needs_revision') {
      versions.push({ id: `sv-${s.id}-2`, submittedAt: '2024-09-27T10:00:00Z', commitSha: `e${i}f${i}g${i}h` })
    }
    subs.push({
      id: `sub-asgn1-${s.id}`,
      assignmentId: 'asgn-1', studentId: s.id, state,
      repositoryId: s.activeProjectId ? `repo-${s.activeProjectId}` : undefined,
      commitSha: state !== 'not_started' ? `${i.toString(16).padStart(7,'0')}` : undefined,
      summary: state !== 'not_started' ? 'Implemented a REST CRUD API with Express and PostgreSQL, covering all four operations with input validation.' : undefined,
      reflection: state === 'reviewed' ? 'I found parameterized queries harder than expected. Next time I will structure the router before writing handlers.' : undefined,
      submittedAt: state !== 'not_started' ? `2024-09-${String(20 + (i % 8)).padStart(2,'0')}T${String(10 + (i % 8))}:00:00Z` : undefined,
      versions,
    })
    void rng()
  })
  return subs
}

export const DEMO_SUBMISSIONS: Submission[] = makeSubmissions()

// ─── Evaluations ──────────────────────────────────────────

export const DEMO_EVALUATIONS: Evaluation[] = DEMO_SUBMISSIONS
  .filter(s => s.state === 'reviewed')
  .map((s, i) => {
    const criterionResults: CriterionResult[] = RUBRIC.map(rc => ({
      criterionId: rc.id,
      score: 18 + (i % 7),
      comment: i % 2 === 0 ? 'Well done, clear structure.' : 'Adequate, could be more thorough.',
    }))
    return {
      id: `eval-${s.id}`, submissionId: s.id, facultyId: 'fac-1', draft: false,
      feedback: 'Good work overall. The data model is clean and the README is clear. Improve test coverage for edge cases.',
      criterionResults, publishedAt: `2024-09-${String(28 + (i % 2)).padStart(2,'0')}T16:00:00Z`,
    }
  })

// ─── Activity heatmap (365 days for a student) ────────────

export function generateHeatmap(studentId: string): DailyActivity[] {
  const rng = seeded(studentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const days: DailyActivity[] = []
  const today = new Date('2024-10-07')
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const r = rng()
    let commits = 0, prs = 0, issues = 0
    let coverage: DailyActivity['coverageState'] = 'healthy'
    if (r > 0.55) { commits = Math.floor(rng() * 6) + 1 }
    if (r > 0.7)  { prs = Math.floor(rng() * 2) }
    if (r > 0.75) { issues = Math.floor(rng() * 2) }
    if (i > 300)  { coverage = 'pending_import' }
    else if (i > 270) { coverage = 'stale' }
    days.push({
      date: dateStr, commitCount: commits, prCount: prs, issueCount: issues,
      qualifiesForStreak: commits >= 3,
      coverageState: coverage,
      repositoryIds: commits > 0 ? [`repo-proj-${studentId.slice(-3)}-1`] : [],
    })
  }
  return days
}

// ─── Streak ───────────────────────────────────────────────

export function computeStreak(heatmap: DailyActivity[]): Streak {
  let current = 0, longest = 0, temp = 0
  let lastQualifyingDate: string | undefined
  for (let i = heatmap.length - 1; i >= 0; i--) {
    const day = heatmap[i]
    if (day.coverageState !== 'healthy' && day.coverageState !== 'stale') break
    if (day.qualifiesForStreak) {
      temp++
      if (!lastQualifyingDate) lastQualifyingDate = day.date
      if (temp > longest) longest = temp
    } else {
      if (i === heatmap.length - 1 || i === heatmap.length - 2) {
        // today or yesterday — don't break
      } else {
        if (current === 0) current = temp
        temp = 0
      }
    }
  }
  if (current === 0) current = temp
  const MILESTONES = [5, 10, 25, 50, 100, 150, 200]
  const MILESTONE_LABELS = ['Getting Started', 'Building Rhythm', 'Consistent Practice', 'Consistent Practice', 'Sustained Practice', 'Sustained Practice', 'Long-Term Commitment']
  const milestones: MilestoneAward[] = MILESTONES
    .filter(m => longest >= m)
    .map((m, idx) => ({ id: `ms-${m}`, threshold: m, awardedAt: '2024-09-01T00:00:00Z', label: MILESTONE_LABELS[idx] }))
  return { current, longest, lastQualifyingDate, milestones }
}

// ─── Batch summary ────────────────────────────────────────

export function batchSummary(batchId: string): BatchSummary {
  const students = studentsByBatch(batchId)
  return {
    batchId,
    enrolledCount: students.length,
    activeStudentCount: students.filter(s => s.observedActivityLast30 > 0).length,
    pendingReviewCount: DEMO_SUBMISSIONS.filter(s => s.state === 'submitted' && studentsByBatch(batchId).find(st => st.id === s.studentId)).length,
    attentionItemCount: students.reduce((a, s) => a + s.attentionItems.length, 0),
    dataFreshnessAt: '2024-10-07T06:00:00Z',
  }
}

// ─── Projects ─────────────────────────────────────────────

function makeProjects(): Project[] {
  const projects: Project[] = []
  for (const batch of DEMO_BATCHES) {
    const students = studentsByBatch(batch.id)
    // Group students into teams of 4
    const groupSize = 4
    for (let g = 0; g < Math.ceil(students.length / groupSize); g++) {
      const groupStudents = students.slice(g * groupSize, (g + 1) * groupSize)
      const projId = `proj-${batch.id}-${g + 1}`
      projects.push({
        id: projId,
        institutionId: 'inst-1',
        batchId: batch.id,
        title: `Project ${g + 1}`,
        description: [
          'Build a full-stack web application with authentication, CRUD operations, and unit tests.',
          'Develop a REST API service with role-based access control and comprehensive documentation.',
          'Create a data visualisation dashboard integrating a public API with real-time updates.',
          'Implement a command-line tool that automates a developer workflow with test coverage.',
          'Design and build a microservice with a message queue and observability instrumentation.',
        ][g % 5],
        type: groupStudents.length > 1 ? 'team' : 'individual',
        memberIds: groupStudents.map(s => s.id),
        repositoryIds: groupStudents.map(s => `repo-${projId}-${s.id.slice(-3)}`).slice(0, 1),
        createdAt: '2024-09-01T10:00:00Z',
      })
    }
  }
  return projects
}

export const DEMO_PROJECTS: Project[] = makeProjects()

export function projectsByBatch(batchId: string): Project[] {
  return DEMO_PROJECTS.filter(p => p.batchId === batchId)
}

export function projectsByStudent(studentId: string): Project[] {
  return DEMO_PROJECTS.filter(p => p.memberIds.includes(studentId))
}

// ─── Notifications ────────────────────────────────────────

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'n-1', userId: 'fac-1', title: '8 submissions awaiting review', body: 'Assignment 1 — SE-E-B has 8 submissions pending review.', message: 'Assignment 1 — SE-E-B has 8 submissions pending review.', type: 'assignment_due', read: false, createdAt: '2024-10-07T07:00:00Z', linkPath: '/assignments/asgn-1' },
  { id: 'n-2', userId: 'fac-1', title: 'Repository access lost', body: '3 students in SE-E-B have lost repository access.', message: '3 students in SE-E-B have lost repository access.', type: 'info', read: false, createdAt: '2024-10-06T16:00:00Z', linkPath: '/students' },
  { id: 'n-3', userId: 'fac-1', title: 'Sync completed', body: 'SE-E-B batch activity sync completed successfully.', message: 'SE-E-B batch activity sync completed successfully.', type: 'info', read: true, createdAt: '2024-10-06T06:00:00Z' },
  { id: 'n-4', userId: 's-b-se-e-b-1', title: 'Feedback published', body: 'Prof. Sharma has published feedback on Assignment 1.', message: 'Prof. Sharma has published feedback on Assignment 1.', type: 'submission_graded', read: false, createdAt: '2024-09-28T16:00:00Z', linkPath: '/assignments/asgn-1' },
  { id: 'n-5', userId: 's-b-se-e-b-1', title: 'Milestone: Building Rhythm', body: 'You reached a 10-day consistency milestone!', message: 'You reached a 10-day consistency milestone!', type: 'milestone_reached', read: true, createdAt: '2024-10-01T00:00:00Z' },
]

// ─── Demo persona ─────────────────────────────────────────

export type DemoPersona = 'faculty' | 'student' | 'admin'

export const DEMO_PERSONAS: Record<DemoPersona, Profile> = {
  faculty: DEMO_FACULTY[0],
  student: {
    id: DEMO_STUDENTS[4].id,
    institutionId: 'inst-1',
    displayName: DEMO_STUDENTS[4].displayName,
    email: DEMO_STUDENTS[4].email,
    role: 'student',
    avatarInitials: DEMO_STUDENTS[4].avatarInitials,
    rollNumber: DEMO_STUDENTS[4].rollNumber,
    githubUsername: DEMO_STUDENTS[4].githubUsername,
    githubConnectionState: DEMO_STUDENTS[4].githubConnectionState,
    lastSyncAt: '2024-10-07T06:00:00Z',
  },
  admin: DEMO_ADMIN,
}
