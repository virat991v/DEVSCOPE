/**
 * Student Profile — faculty view.
 * Header: identity, GitHub state, last sync.
 * Tabs: Overview (heatmap + evidence), Projects, Assignments, Activity, Outcomes.
 */
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { GitFork, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { relativeDate } from '@/lib/utils'
import { service } from '@/services'
import { DEMO_STUDENTS, DEMO_ASSIGNMENTS, DEMO_SUBMISSIONS, DEMO_EVALUATIONS } from '@/lib/demo-data'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ActivityHeatmap } from '@/features/activity/ActivityHeatmap'
import { EvidenceRail, buildEvidenceStages } from '@/features/submissions/EvidenceRail'
import type { Student } from '@/types'

// ─── GitHub connection badge ──────────────────────────────

function GitHubStateBadge({ state }: { state: Student['githubConnectionState'] }) {
  const map: Record<Student['githubConnectionState'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
    healthy:                    { label: 'GitHub connected & healthy', variant: 'success' },
    degraded:                   { label: 'GitHub degraded',            variant: 'warning' },
    not_connected:              { label: 'GitHub not connected',       variant: 'default' },
    authorization_pending:      { label: 'Authorization pending',      variant: 'warning' },
    identity_connected:         { label: 'Identity connected',         variant: 'info' },
    installation_pending:       { label: 'Installation pending',       variant: 'warning' },
    repository_selection_pending:{ label: 'Select repository',         variant: 'warning' },
    initial_sync:               { label: 'Initial sync',               variant: 'warning' },
    disconnected:               { label: 'GitHub disconnected',        variant: 'danger' },
  }
  const { label, variant } = map[state]
  return <Badge variant={variant}>{label}</Badge>
}

// ─── Coverage state badge ─────────────────────────────────

function CoverageBadge({ state }: { state: Student['coverageState'] }) {
  const map: Record<Student['coverageState'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
    healthy:        { label: 'Coverage healthy',      variant: 'success' },
    pending_import: { label: 'Import pending',        variant: 'default' },
    stale:          { label: 'Coverage stale',        variant: 'warning' },
    disconnected:   { label: 'Coverage disconnected', variant: 'danger' },
    unavailable:    { label: 'Coverage unavailable',  variant: 'default' },
  }
  const { label, variant } = map[state]
  return <Badge variant={variant}>{label}</Badge>
}

// ─── Tiny metric ──────────────────────────────────────────

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center px-4">
      <p className="text-xl font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="text-xs text-text-muted leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-text-muted/70">{sub}</p>}
    </div>
  )
}

// ─── Profile page ─────────────────────────────────────────

interface StudentProfileProps {
  studentId?: string
}

export function StudentProfile({ studentId: propId }: StudentProfileProps) {
  const { studentId: paramId } = useParams<{ studentId: string }>()
  const sid = propId ?? paramId ?? DEMO_STUDENTS[4].id

  const student = DEMO_STUDENTS.find(s => s.id === sid) ?? DEMO_STUDENTS[4]

  const { data: heatmap = [], isLoading: heatLoading } = useQuery({
    queryKey: ['heatmap', sid],
    queryFn: () => service.getHeatmap(sid),
  })

  const { data: streak } = useQuery({
    queryKey: ['streak', sid],
    queryFn: () => service.getStreak(sid),
  })

  const submissions = DEMO_SUBMISSIONS.filter(s => s.studentId === sid)
  const assignments = DEMO_ASSIGNMENTS

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Profile header */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar initials={student.avatarInitials} size="lg" />
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold text-text-primary">{student.displayName}</h1>
                <GitHubStateBadge state={student.githubConnectionState} />
                <CoverageBadge state={student.coverageState} />
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-text-muted">
                <span className="font-mono text-xs">{student.rollNumber}</span>
                <span className="text-border-strong">·</span>
                <span>{student.email}</span>
                {student.githubUsername && (
                  <>
                    <span className="text-border-strong">·</span>
                    <a
                      href={`https://github.com/${student.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary-bright hover:text-primary-hover transition-colors"
                    >
                      <GitFork size={13} />
                      {student.githubUsername}
                    </a>
                  </>
                )}
              </div>
              {student.lastObservedEvent && (
                <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                  <Clock size={11} />
                  Last observed event: {relativeDate(student.lastObservedEvent)}
                  <span className="ml-2 text-text-disabled">· Data freshness: {student.dataFreshnessAt ? relativeDate(student.dataFreshnessAt) : 'unknown'}</span>
                </p>
              )}
            </div>
            {/* Key metrics */}
            <div className="flex items-center divide-x divide-border">
              {streak && (
                <>
                  <Metric label="Current streak" value={`${streak.current}d`} sub="qualifying days" />
                  <Metric label="Longest streak" value={`${streak.longest}d`} />
                </>
              )}
              <Metric label="Activity (30d)" value={student.observedActivityLast30} sub="observed commits" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="pt-4 space-y-5">
          <div className="flex gap-5 flex-col lg:flex-row">
            {/* Main: heatmap + evidence */}
            <div className="flex-[2] min-w-0 space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Academic Activity</h2>
                    <span className="text-xs text-text-muted">Approved repositories only · Asia/Kolkata</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {heatLoading
                    ? <Skeleton className="h-28 w-full" />
                    : <ActivityHeatmap data={heatmap} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-text-primary">Assignment Evidence</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignments.map(asgn => {
                    const sub = submissions.find(s => s.assignmentId === asgn.id)
                    const evaluation = sub ? DEMO_EVALUATIONS.find(e => e.submissionId === sub.id) : undefined
                    const stages = buildEvidenceStages({
                      assignmentTitle: asgn.title,
                      repositoryApproval: student.githubConnectionState === 'healthy' ? 'approved' : 'proposed',
                      submissionState: sub?.state ?? 'not_started',
                      hasEvaluation: !!evaluation,
                    })
                    return (
                      <div key={asgn.id} className="space-y-1.5">
                        <p className="text-sm text-text-secondary font-medium">{asgn.title}</p>
                        <EvidenceRail stages={stages} />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right: faculty notes + outstanding work */}
            <div className="flex-[1] min-w-[240px] space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Faculty Notes</h2>
                    <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-medium">Faculty only</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full bg-canvas-subtle border border-border rounded-[var(--radius-control)] p-2.5 text-sm text-text-secondary resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 placeholder:text-text-muted"
                    rows={4}
                    placeholder="Private notes — not visible to the student…"
                    aria-label="Faculty notes (private)"
                  />
                  <p className="text-[10px] text-text-muted mt-1.5">Student-facing feedback is attached to evaluated submissions.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-text-primary">Outstanding Work</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  {assignments
                    .filter(a => {
                      const sub = submissions.find(s => s.assignmentId === a.id)
                      return !sub || sub.state === 'not_started' || sub.state === 'draft'
                    })
                    .map(a => (
                      <div key={a.id} className="flex items-start gap-2">
                        <AlertCircle size={13} className="text-warning mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-text-secondary">{a.title}</p>
                          <p className="text-[11px] text-text-muted">Due {new Date(a.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                  {assignments.every(a => {
                    const sub = submissions.find(s => s.assignmentId === a.id)
                    return sub && sub.state !== 'not_started' && sub.state !== 'draft'
                  }) && (
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 size={13} className="text-success" />
                      No outstanding work
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="pt-4">
          <Card><CardContent>
            <p className="text-sm text-text-muted">Project details — available in Phase 2.</p>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="assignments" className="pt-4">
          <Card><CardContent>
            <p className="text-sm text-text-muted">Assignment history — available in Phase 2.</p>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <Card><CardContent>
            <p className="text-sm text-text-muted">Full activity explorer — available in Phase 4.</p>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="outcomes" className="pt-4">
          <Card><CardContent>
            <p className="text-sm text-text-muted">Outcome mappings — available after rubric evaluation (Phase 5).</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
