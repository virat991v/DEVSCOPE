/**
 * Faculty Dashboard — Figma-aligned redesign.
 * Matches the Figma prototype: metric cards, batch activity sparkline,
 * needs-attention categories, recent-dev + review-next panels, student table.
 */
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  RefreshCw, ChevronDown, Search, ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { cn, fmt, relativeDate } from '@/lib/utils'
import { service } from '@/services'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonText } from '@/components/ui/Skeleton'
import type { AcademicBatch, Assignment, Student, Submission } from '@/types'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'

// ─── Metric card ──────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: number | string
  sub: string
  variant?: 'default' | 'warning' | 'success'
}

function MetricCard({ label, value, sub, variant = 'default' }: MetricCardProps) {
  const valueColor = variant === 'warning'
    ? 'text-warning'
    : variant === 'success'
    ? 'text-success-bright'
    : 'text-text-primary'

  return (
    <div className="flex-1 min-w-[140px] bg-surface border border-border rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs text-text-muted">{label} <span className="text-[10px] align-middle opacity-60">ⓘ</span></p>
      <p className={cn('text-3xl font-semibold tabular-nums leading-tight', valueColor)}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      <p className="text-[11px] text-text-muted leading-snug">{sub}</p>
    </div>
  )
}

// ─── Batch activity summary ───────────────────────────────

function BatchActivityPanel({ batch, students }: { batch: AcademicBatch; students: Student[] }) {
  const observedCommits = students.reduce((total, student) => total + student.observedActivityLast30, 0)
  const activeStudents = students.filter(student => student.observedActivityLast30 > 0).length
  const freshStudents = students.filter(student => Boolean(student.dataFreshnessAt)).length

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">Batch development activity</p>
        <p className="text-xs text-text-muted">{batch.label} · Observed activity from approved repositories</p>
      </div>
      {freshStudents > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard label="Observed commits" value={observedCommits} sub="Last 30 days" variant="success" />
          <MetricCard label="Active students" value={activeStudents} sub="With observed activity" />
          <MetricCard label="Fresh connections" value={freshStudents} sub="Students with a recent sync" />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-raised px-4 py-5 text-sm text-text-muted">
          No GitHub activity has been imported for this batch yet. Activity appears after students connect approved repositories and a sync completes.
        </div>
      )}
      <p className="text-[11px] text-text-muted">Observed activity is evidence for review, not a grade or a measure of effort.</p>
    </div>
  )
}

// ─── Needs-attention section ──────────────────────────────

interface AttentionCategory {
  count: number
  label: string
  action: string
  variant: 'warning' | 'info' | 'danger'
  destination: string
}

function NeedsAttentionPanel({
  students,
  pendingReviewCount,
  revisionCount,
}: {
  students: Student[]
  pendingReviewCount: number
  revisionCount: number
}) {
  const navigate = useNavigate()
  const noActivity = students.filter(student =>
    student.githubConnectionState === 'healthy'
    && Boolean(student.dataFreshnessAt)
    && student.observedActivityLast30 === 0,
  ).length
  const disconnected = students.filter(student =>
    student.githubConnectionState === 'not_connected'
    || student.githubConnectionState === 'disconnected',
  ).length
  const syncAttention = students.filter(student => student.githubConnectionState === 'degraded').length
  const allCategories: AttentionCategory[] = [
    { count: pendingReviewCount, label: 'Awaiting review', action: 'Open submitted evidence →', variant: 'warning', destination: '/assignments' },
    { count: revisionCount, label: 'Changes requested', action: 'Review resubmissions →', variant: 'warning', destination: '/assignments' },
    { count: noActivity, label: 'No observed activity', action: 'Fresh GitHub data · last 30 days →', variant: 'info', destination: '/students' },
    { count: disconnected, label: 'GitHub not connected', action: 'Open student directory →', variant: 'danger', destination: '/students' },
    { count: syncAttention, label: 'Sync needs attention', action: 'Open affected students →', variant: 'danger', destination: '/students' },
  ]
  const categories = allCategories.filter(category => category.count > 0)
  const affectedStudents = new Set(students.filter(student =>
    student.githubConnectionState === 'not_connected'
    || student.githubConnectionState === 'disconnected'
    || student.githubConnectionState === 'degraded'
    || (student.githubConnectionState === 'healthy' && Boolean(student.dataFreshnessAt) && student.observedActivityLast30 === 0),
  ).map(student => student.id)).size

  const variantStyles = {
    warning: { countColor: 'text-warning', bg: 'bg-warning-bg', border: 'border-warning/20' },
    info:    { countColor: 'text-primary-bright', bg: 'bg-primary-dim', border: 'border-primary/20' },
    danger:  { countColor: 'text-danger-soft', bg: 'bg-danger-bg', border: 'border-danger/20' },
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Needs attention</p>
          <p className="text-xs text-text-muted">{affectedStudents} students with data or activity follow-up</p>
        </div>
        <button type="button" onClick={() => navigate('/students')} className="text-xs text-primary-bright hover:underline">View all →</button>
      </div>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-raised px-3 py-4 text-sm text-text-muted">No current review, connection, or activity follow-up.</p>
        ) : categories.map(cat => {
          const s = variantStyles[cat.variant]
          return (
            <button
              type="button"
              key={cat.label}
              onClick={() => navigate(cat.destination)}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 border', s.bg, s.border)}
            >
              <span className={cn('text-2xl font-semibold tabular-nums w-6 shrink-0', s.countColor)}>
                {cat.count}
              </span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-text-primary leading-tight">{cat.label}</p>
                <p className="text-xs text-primary-bright mt-0.5 truncate">{cat.action}</p>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-text-muted">
        Connection and sync problems are not inactivity.
      </p>
    </div>
  )
}

// ─── Development evidence status ──────────────────────────

function RecentDevPanel({ students }: { students: Student[] }) {
  const synced = students.filter(student => Boolean(student.lastObservedEvent))
  const observed = students.filter(student => student.observedActivityLast30 > 0)
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold text-text-primary">Development evidence</p>
        <p className="text-xs text-text-muted">Approved repositories only</p>
      </div>
      {synced.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-4 text-sm text-text-muted">
          No GitHub evidence has been synced for this batch yet.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums text-text-primary">{observed.length}</p>
          <p className="text-sm text-text-secondary">students with observed activity in the last 30 days</p>
          <p className="text-xs text-text-muted">{synced.length} student{synced.length === 1 ? '' : 's'} have a recorded GitHub sync.</p>
        </div>
      )}
      <p className="text-[11px] text-text-muted">Event-level commit, pull request, and issue review is introduced with the activity-attribution phase.</p>
    </div>
  )
}

// ─── Review next panel ────────────────────────────────────

interface ReviewQueueItem {
  assignment: Assignment
  submission: Submission
  student: Student | undefined
}

function ReviewNextPanel({ items }: { items: ReviewQueueItem[] }) {
  const navigate = useNavigate()
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold text-text-primary">Review next</p>
        <p className="text-xs text-text-muted">Prioritized by due date, not commit count</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-4 text-sm text-text-muted">No submissions are awaiting review.</div>
      ) : items.slice(0, 2).map(item => (
        <div key={item.submission.id} className="border border-border rounded-lg p-3 space-y-2 hover:border-border-strong transition-colors">
          <div className="flex gap-2 items-start">
            <Avatar initials={item.student?.avatarInitials ?? '??'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary leading-tight">{item.assignment.title}</p>
              <p className="text-xs text-text-muted">{item.student?.displayName ?? 'Student'} · {item.student?.activeProjectName ?? 'No project linked'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-text-muted">Due {new Date(item.assignment.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p className="text-[11px] text-text-muted">{item.submission.state === 'needs_revision' ? 'Resubmission ready for review' : 'Submitted and awaiting review'}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/assignments/${item.assignment.id}`)}
              className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
            >
              Inspect submitted evidence <ArrowRight size={11} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Student table ────────────────────────────────────────

const GH_STATE_BADGE: Record<Student['githubConnectionState'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  healthy:                      { label: 'Healthy',       variant: 'success'  },
  degraded:                     { label: 'Degraded',      variant: 'warning'  },
  not_connected:                { label: 'Not connected', variant: 'default'  },
  authorization_pending:        { label: 'Auth pending',  variant: 'warning'  },
  identity_connected:           { label: 'Connected',     variant: 'success'  },
  installation_pending:         { label: 'Install…',      variant: 'warning'  },
  repository_selection_pending: { label: 'Select repo',   variant: 'warning'  },
  initial_sync:                 { label: 'Syncing',       variant: 'warning'  },
  disconnected:                 { label: 'Disconnected',  variant: 'danger'   },
}

const PAGE_SIZE = 25

function StudentRow({ student }: { student: Student }) {
  const navigate = useNavigate()
  const gh = GH_STATE_BADGE[student.githubConnectionState]
  return (
    <tr className="border-b border-border/50 hover:bg-surface-raised transition-colors group">
      <td className="py-3 px-4">
        <button
          type="button"
          onClick={() => navigate(`/students/${student.id}`)}
          className="flex items-center gap-2.5 text-left rounded focus:outline-none focus:ring-1 focus:ring-primary/60"
          aria-label={`Open ${student.displayName}'s profile`}
        >
          <Avatar initials={student.avatarInitials} size="sm" />
          <div>
            <p className="text-sm text-text-primary font-medium leading-tight">{student.displayName}</p>
            <p className="text-[11px] text-text-muted font-mono leading-tight">{student.rollNumber}</p>
          </div>
          {student.attentionItems.length > 0 && (
            <AlertTriangle size={12} className="text-warning ml-0.5 shrink-0" />
          )}
        </button>
      </td>
      <td className="py-3 px-4">
        <Badge variant={gh.variant}>{gh.label}</Badge>
      </td>
      <td className="py-3 px-4 text-sm text-text-secondary truncate max-w-[140px]">
        {student.activeProjectName ?? <span className="text-text-muted">—</span>}
      </td>
      <td className="py-3 px-4 tabular-nums text-sm text-text-secondary">
        {student.observedActivityLast30 > 0 ? student.observedActivityLast30 : <span className="text-text-muted">—</span>}
      </td>
      <td className="py-3 px-4 tabular-nums text-sm">
        {student.currentStreak > 0
          ? <span className="text-primary-bright">{student.currentStreak}d</span>
          : <span className="text-text-muted">—</span>}
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">
        {student.lastObservedEvent ? relativeDate(student.lastObservedEvent) : '—'}
      </td>
    </tr>
  )
}

// ─── Main Dashboard page ──────────────────────────────────

export function FacultyOverview() {
  const { profile } = useAuth()
  const facultyId = profile?.id ?? ''
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const { data: allBatches = [], isLoading: batchesLoading, error: batchesError, refetch: refetchBatches } = useQuery({
    queryKey: ['faculty-batches', facultyId],
    queryFn: () => service.getBatches(),
    enabled: Boolean(facultyId),
  })

  // In real mode RLS exposes a faculty member's own assignment rows in the
  // nested relation. Filtering on those rows keeps the dashboard scoped to
  // explicitly assigned batches; demo data follows the same shape.
  const batches = allBatches.filter(batch => !facultyId || batch.facultyIds.includes(facultyId))
  const activeBatchId = batches.some(batch => batch.id === selectedBatchId)
    ? selectedBatchId
    : (batches[0]?.id ?? '')
  const batch = batches.find(candidate => candidate.id === activeBatchId)

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['batch-summary', activeBatchId],
    queryFn: () => service.getBatchSummary(activeBatchId),
    enabled: Boolean(activeBatchId),
  })

  const { data: students = [], isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['students', activeBatchId],
    queryFn: () => service.getStudents(activeBatchId),
    enabled: Boolean(activeBatchId),
  })

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments', activeBatchId],
    queryFn: () => service.getAssignments(activeBatchId),
    enabled: Boolean(activeBatchId),
  })

  const assignmentIds = assignments.map(assignment => assignment.id).join(',')
  const { data: reviewQueue = [], refetch: refetchReviewQueue } = useQuery({
    queryKey: ['faculty-review-queue', activeBatchId, assignmentIds, students.map(student => student.id).join(',')],
    queryFn: async (): Promise<ReviewQueueItem[]> => {
      const submissionGroups = await Promise.all(assignments.map(async assignment => ({
        assignment,
        submissions: await service.getSubmissions(assignment.id),
      })))
      const studentsById = new Map(students.map(student => [student.id, student]))
      return submissionGroups
        .flatMap(({ assignment, submissions }) => submissions
          .filter(submission => submission.state === 'submitted' || submission.state === 'needs_revision')
          .map(submission => ({ assignment, submission, student: studentsById.get(submission.studentId) })))
        .sort((left, right) => new Date(left.assignment.deadline).getTime() - new Date(right.assignment.deadline).getTime())
    },
    enabled: Boolean(activeBatchId) && assignments.length > 0,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return students
    return students.filter(s =>
      s.displayName.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.githubUsername?.toLowerCase().includes(q)
    )
  }, [students, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageStudents = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const studentsOnStreak = students.filter(student => student.currentStreak > 0).length
  const pendingReviewCount = reviewQueue.filter(item => item.submission.state === 'submitted').length
  const revisionCount = reviewQueue.filter(item => item.submission.state === 'needs_revision').length

  async function refreshDashboard() {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchBatches(),
        refetchSummary(),
        refetchStudents(),
        refetchAssignments(),
        refetchReviewQueue(),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  if (batchesLoading) {
    return <div className="p-6"><SkeletonText lines={6} /></div>
  }

  if (batchesError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-bg p-5 space-y-3 max-w-xl">
        <h1 className="text-lg font-semibold text-text-primary">Faculty dashboard unavailable</h1>
        <p className="text-sm text-text-secondary">Your assigned batches could not be loaded. Refresh and try again; if the problem continues, ask an administrator to check your batch assignment.</p>
        <button type="button" onClick={() => void refetchBatches()} className="h-8 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary">Retry</button>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-lg font-semibold text-text-primary">No batch assigned</h1>
        <p className="text-sm text-text-muted">Your account is signed in, but it is not currently assigned to an active academic batch. An administrator can add the assignment from the academic structure settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* ── Top bar: breadcrumb + batch selector ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-text-muted">
            {batch.semester || 'Academic term'} / {batch.division || 'Programme'} / {batch.section} / <span className="text-text-secondary">Dashboard</span>
          </p>
          <h1 className="text-xl font-semibold text-text-primary mt-0.5">Faculty Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeBatchId}
              onChange={e => { setSelectedBatchId(e.target.value); setPage(0); setSearch('') }}
              className="appearance-none bg-surface border border-border rounded-lg px-3 pr-8 h-9 text-sm text-text-primary focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.label} · {b.enrolledCount}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="flex items-center gap-1.5 h-9 px-3 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg hover:border-border-strong bg-surface transition-colors disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div className="flex gap-3 flex-wrap">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[140px] h-[108px] bg-surface border border-border rounded-xl animate-pulse" />
          ))
        ) : summary ? (
          <>
            <MetricCard
              label="Total students"
              value={summary.enrolledCount}
              sub={`Selected batch · ${batch.semester || 'current term'}`}
            />
            <MetricCard
              label="Active in 30 days"
              value={summary.activeStudentCount}
              sub="Observed GitHub activity"
              variant="success"
            />
            <MetricCard
              label="Students on streak"
              value={studentsOnStreak}
              sub="≥3 eligible commits / qualified day"
            />
            <MetricCard
              label="Awaiting review"
              value={pendingReviewCount || summary.pendingReviewCount}
              sub="Submitted evidence awaiting faculty review"
              variant="warning"
            />
          </>
        ) : null}
      </div>

      {/* ── Batch activity chart ── */}
      <BatchActivityPanel batch={batch} students={students} />

      {/* ── Middle row: needs-attention + recent dev + review next ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <NeedsAttentionPanel students={students} pendingReviewCount={pendingReviewCount} revisionCount={revisionCount} />
        <RecentDevPanel students={students} />
        <ReviewNextPanel items={reviewQueue} />
      </div>

      {/* ── Student table ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-text-primary">Students in {batch.label}</p>
            <p className="text-xs text-text-muted">Development evidence and review states · Sorted by last activity</p>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search name, roll or GitHub handle"
              className="w-64 h-9 pl-8 pr-3 bg-canvas border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {studentsLoading ? (
            <div className="p-5"><SkeletonText lines={8} /></div>
          ) : (
            <table className="w-full min-w-[680px]" aria-label={`Students in ${batch.label}`}>
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  {['Student', 'GitHub', 'Project', 'Activity (30d)', 'Streak', 'Last event'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left text-xs font-medium text-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      No students match "{search}"
                    </td>
                  </tr>
                ) : (
                  pageStudents.map(s => <StudentRow key={s.id} student={s} />)
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <span>25 / page</span>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="size-7 flex items-center justify-center rounded border border-border hover:border-border-strong disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-raised transition-colors"
                aria-label="Previous page"
              >
                <ArrowLeft size={12} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    'size-7 flex items-center justify-center rounded border text-xs transition-colors',
                    page === i
                      ? 'border-primary bg-primary text-white'
                      : 'border-border hover:border-border-strong hover:bg-surface-raised',
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="size-7 flex items-center justify-center rounded border border-border hover:border-border-strong disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-raised transition-colors"
                aria-label="Next page"
              >
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
