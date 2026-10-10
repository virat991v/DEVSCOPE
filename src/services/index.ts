/**
 * Typed service boundary.
 * Auto-selects the real Supabase adapter when credentials are configured,
 * otherwise falls back to the deterministic demo adapter.
 *
 * No production code may silently substitute fake data after an API error.
 */
import type {
  Profile, AcademicBatch, Student, BatchSummary,
  Assignment, Submission, Evaluation, DailyActivity,
  Streak, Notification, Repository, Project,
} from '@/types'
import {
  DEMO_INSTITUTION, DEMO_BATCHES, DEMO_STUDENTS, DEMO_FACULTY, DEMO_ADMIN,
  DEMO_ASSIGNMENTS, DEMO_SUBMISSIONS, DEMO_EVALUATIONS, DEMO_NOTIFICATIONS,
  DEMO_PERSONAS, batchSummary, generateHeatmap, computeStreak, studentsByBatch,
  projectsByBatch, projectsByStudent,
  type DemoPersona,
} from '@/lib/demo-data'
import { isSupabaseConfigured } from '@/lib/supabase'
import { supabaseService } from '@/services/supabase-adapter'

// ─── Write payload types ──────────────────────────────────

export interface SubmitAssignmentPayload {
  assignmentId: string
  commitSha: string
  summary: string
  reflection: string
}

export interface SaveEvaluationPayload {
  submissionId: string
  facultyId: string
  scores: Record<string, number>          // criterionId → score
  comments: Record<string, string>        // criterionId → comment
  feedback: string
  publish: boolean                        // false = save draft, true = publish
}

export interface UpdateProfilePayload {
  displayName: string
}

// ─── Service interface ────────────────────────────────────

export interface DevAtlasService {
  // ── Reads ──────────────────────────────────────────────
  getCurrentProfile(): Promise<Profile>
  getBatches(): Promise<AcademicBatch[]>
  getBatchSummary(batchId: string): Promise<BatchSummary>
  getStudents(batchId: string): Promise<Student[]>
  getStudent(studentId: string): Promise<Student | null>
  getAssignments(batchId: string): Promise<Assignment[]>
  getAssignment(assignmentId: string): Promise<Assignment | null>
  getSubmissions(assignmentId: string): Promise<Submission[]>
  getEvaluation(submissionId: string): Promise<Evaluation | null>
  getHeatmap(studentId: string): Promise<DailyActivity[]>
  getStreak(studentId: string): Promise<Streak>
  getNotifications(userId: string): Promise<Notification[]>
  getRepositories(projectId: string): Promise<Repository[]>
  /** For faculty: batchId. For students: studentId (returns their own projects). */
  getProjects(batchOrStudentId: string): Promise<Project[]>
  // ── Writes ─────────────────────────────────────────────
  updateProfile(profileId: string, payload: UpdateProfilePayload): Promise<void>
  markAllNotificationsRead(userId: string): Promise<void>
  submitAssignment(payload: SubmitAssignmentPayload): Promise<void>
  saveEvaluation(payload: SaveEvaluationPayload): Promise<void>
  requestRevision(submissionId: string): Promise<void>
  createInvite(email: string, role: 'student' | 'faculty'): Promise<string>  // returns invite link
}

// ─── Demo adapter ─────────────────────────────────────────

let currentPersona: DemoPersona = 'faculty'

export function setDemoPersona(p: DemoPersona): void {
  currentPersona = p
}

export function getDemoPersona(): DemoPersona {
  return currentPersona
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

export const demoService: DevAtlasService = {
  getCurrentProfile: () => delay(DEMO_PERSONAS[currentPersona]),
  getBatches: () => delay(DEMO_BATCHES),
  getBatchSummary: (batchId) => delay(batchSummary(batchId)),
  getStudents: (batchId) => delay(studentsByBatch(batchId)),
  getStudent: (studentId) => delay(DEMO_STUDENTS.find(s => s.id === studentId) ?? null),
  getAssignments: (batchId) => delay(DEMO_ASSIGNMENTS.filter(a => a.batchId === batchId)),
  getAssignment: (assignmentId) => delay(DEMO_ASSIGNMENTS.find(a => a.id === assignmentId) ?? null),
  getSubmissions: (assignmentId) => delay(DEMO_SUBMISSIONS.filter(s => s.assignmentId === assignmentId)),
  getEvaluation: (submissionId) => delay(DEMO_EVALUATIONS.find(e => e.submissionId === submissionId) ?? null),
  getHeatmap: (studentId) => delay(generateHeatmap(studentId)),
  getStreak: async (studentId) => delay(computeStreak(generateHeatmap(studentId))),
  getNotifications: (userId) => delay(DEMO_NOTIFICATIONS.filter(n => n.userId === userId)),
  getRepositories: (projectId) => delay([{
    id: `repo-${projectId}-1`,
    projectId,
    githubOwner: 'apex-student',
    githubRepo: `project-${projectId.slice(-3)}`,
    fullName: `apex-student/project-${projectId.slice(-3)}`,
    approvalState: 'approved' as const,
    isPrivate: true,
    coverageState: 'healthy' as const,
    lastSyncAt: '2024-10-07T06:00:00Z',
  }]),
  getProjects: (batchOrStudentId) => {
    // If the ID matches a batch, return batch projects; otherwise return student projects
    const byBatch = projectsByBatch(batchOrStudentId)
    return delay(byBatch.length > 0 ? byBatch : projectsByStudent(batchOrStudentId))
  },
  updateProfile: (_id, _payload) => delay(undefined),
  markAllNotificationsRead: (_userId) => delay(undefined),
  submitAssignment: (_payload) => delay(undefined),
  saveEvaluation: (_payload) => delay(undefined),
  requestRevision: (_submissionId) => delay(undefined),
  createInvite: (email, role) => delay(`${window.location.origin}/accept-invite?token=demo_${role}_${email.split('@')[0]}`),
}

// ─── Active service — auto-switches based on env ──────────
// When VITE_SUPABASE_URL is set: use real Supabase adapter (RLS enforced)
// Otherwise: use deterministic demo adapter (no credentials needed)
export const service: DevAtlasService = isSupabaseConfigured ? supabaseService : demoService

// ─── Re-exports for convenience ───────────────────────────
export { DEMO_INSTITUTION, DEMO_FACULTY, DEMO_ADMIN, DEMO_BATCHES, DEMO_PERSONAS }
