// ─── Core domain types for DevAtlas ────────────────────────

export type Role = 'student' | 'faculty' | 'admin'

export type GitHubConnectionState =
  | 'not_connected'
  | 'authorization_pending'
  | 'identity_connected'
  | 'installation_pending'
  | 'repository_selection_pending'
  | 'initial_sync'
  | 'healthy'
  | 'degraded'
  | 'disconnected'

export type RepositoryApprovalState =
  | 'proposed'
  | 'approved'
  | 'declined'
  | 'disconnected'
  | 'archived'

export type AssignmentState =
  | 'draft'
  | 'published'
  | 'closed'

export type SubmissionState =
  | 'not_started'
  | 'draft'
  | 'submitted'
  | 'needs_revision'
  | 'reviewed'

export type CoverageState =
  | 'healthy'
  | 'pending_import'
  | 'stale'
  | 'disconnected'
  | 'unavailable'

export type AttentionReason =
  | 'overdue_submission'
  | 'review_pending'
  | 'no_activity'
  | 'github_broken'
  | 'repository_access_lost'
  | 'stale_sync'

// ─── Identity ─────────────────────────────────────────────

export interface Institution {
  id: string
  name: string
  slug: string
  timezone: string
}

export interface Profile {
  id: string
  institutionId: string
  displayName: string
  email: string
  role: Role
  avatarInitials: string
  rollNumber?: string
  githubUsername?: string
  githubConnectionState: GitHubConnectionState
  lastSyncAt?: string
}

// ─── Academics ────────────────────────────────────────────

export interface AcademicBatch {
  id: string
  institutionId: string
  /** Human-readable label e.g. "SE-E-B" */
  label: string
  /** Section letter e.g. "B" */
  section: string
  division: string
  year: string
  semester: string
  enrolledCount: number
  facultyIds: string[]
  /** Whether the batch is actively enrolling */
  isActive: boolean
  /** Short program name e.g. "B.E. Computer Engineering" */
  program: string
  /** Current semester number */
  currentSemester: number
  /** Number of enrolled students (alias for enrolledCount) */
  studentCount: number
}

export interface Student {
  id: string
  profileId: string
  batchId: string
  rollNumber: string
  displayName: string
  email: string
  avatarInitials: string
  githubUsername?: string
  githubConnectionState: GitHubConnectionState
  activeProjectId?: string
  activeProjectName?: string
  observedActivityLast30: number
  currentStreak: number
  lastObservedEvent?: string
  submissionState?: SubmissionState
  dataFreshnessAt?: string
  coverageState: CoverageState
  attentionItems: AttentionItem[]
}

// ─── Work ─────────────────────────────────────────────────

export interface Project {
  id: string
  institutionId: string
  batchId: string
  title: string
  description: string
  type: 'individual' | 'team'
  memberIds: string[]
  repositoryIds: string[]
  createdAt: string
}

export interface Repository {
  id: string
  projectId: string
  githubOwner: string
  githubRepo: string
  fullName: string
  approvalState: RepositoryApprovalState
  isPrivate: boolean
  coverageState: CoverageState
  lastSyncAt?: string
}

export interface Assignment {
  id: string
  batchId: string
  title: string
  description: string
  state: AssignmentState
  mode: 'individual' | 'team'
  deadline: string
  timezone: string
  rubricCriteria: RubricCriterion[]
  publishedAt?: string
}

export interface RubricCriterion {
  id: string
  label: string
  description: string
  maxPoints: number
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  state: SubmissionState
  repositoryId?: string
  commitSha?: string
  prUrl?: string
  summary?: string
  demoUrl?: string
  reflection?: string
  submittedAt?: string
  versions: SubmissionVersion[]
}

export interface SubmissionVersion {
  id: string
  submittedAt: string
  commitSha?: string
  summary?: string
}

export interface Evaluation {
  id: string
  submissionId: string
  facultyId: string
  draft: boolean
  feedback: string
  criterionResults: CriterionResult[]
  publishedAt?: string
}

export interface CriterionResult {
  criterionId: string
  score: number
  comment?: string
}

// ─── Activity ─────────────────────────────────────────────

export interface DailyActivity {
  date: string        // YYYY-MM-DD
  commitCount: number
  prCount: number
  issueCount: number
  qualifiesForStreak: boolean
  coverageState: CoverageState
  repositoryIds: string[]
}

export interface Streak {
  current: number
  longest: number
  lastQualifyingDate?: string
  milestones: MilestoneAward[]
}

export interface MilestoneAward {
  id: string
  threshold: number
  awardedAt: string
  label: string
}

export interface AttentionItem {
  id: string
  studentId: string
  reason: AttentionReason
  label: string
  detail: string
  severity: 'info' | 'warning' | 'error'
  createdAt: string
}

// ─── Notifications ────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  /** Convenience alias: same as body, used in notification lists */
  message: string
  /** Notification category */
  type: 'assignment_due' | 'submission_graded' | 'pr_merged' | 'streak_broken' | 'milestone_reached' | 'info'
  read: boolean
  createdAt: string
  linkPath?: string
}

// ─── Summary metrics (faculty overview) ──────────────────

export interface BatchSummary {
  batchId: string
  enrolledCount: number
  activeStudentCount: number
  pendingReviewCount: number
  attentionItemCount: number
  dataFreshnessAt: string
}
