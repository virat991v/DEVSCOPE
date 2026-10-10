/**
 * Student Workspace — student-facing home.
 * Lead: Next to do. Active project progress. Heatmap. Development tower.
 * Supportive copy, no shaming. Current streak with timezone and rule.
 */
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, GitBranch, Calendar, ArrowRight, Flame, Trophy } from 'lucide-react'
import { cn, relativeDate } from '@/lib/utils'
import { service } from '@/services'
import { DEMO_STUDENTS, DEMO_ASSIGNMENTS, DEMO_SUBMISSIONS } from '@/lib/demo-data'
import { useAuth } from '@/app/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ActivityHeatmap } from '@/features/activity/ActivityHeatmap'
import { DevelopmentTower } from '@/features/streaks/DevelopmentTower'
import { EvidenceRail, buildEvidenceStages } from '@/features/submissions/EvidenceRail'

export function StudentWorkspace() {
  const { profile, isDemo } = useAuth()
  const navigate = useNavigate()

  // In demo mode fall back to fixture data so the page works without auth
  const demoStudent = DEMO_STUDENTS[4]
  const studentId = isDemo ? demoStudent.id : (profile?.id ?? demoStudent.id)
  const displayName = isDemo ? demoStudent.displayName : (profile?.displayName ?? demoStudent.displayName)
  const rollNumber  = isDemo ? demoStudent.rollNumber  : (profile?.rollNumber  ?? undefined)
  const githubUsername = isDemo ? demoStudent.githubUsername : (profile?.githubUsername ?? undefined)
  const githubConnectionState = isDemo
    ? demoStudent.githubConnectionState
    : (profile?.githubConnectionState ?? 'not_connected')

  const { data: heatmap = [], isLoading: heatLoading } = useQuery({
    queryKey: ['heatmap', studentId],
    queryFn: () => service.getHeatmap(studentId),
  })

  const { data: streak } = useQuery({
    queryKey: ['streak', studentId],
    queryFn: () => service.getStreak(studentId),
  })

  const assignments = DEMO_ASSIGNMENTS.filter(a => a.state === 'published')
  const submissions = DEMO_SUBMISSIONS.filter(s => s.studentId === studentId)
  const nextAssignment = assignments.find(a => {
    const sub = submissions.find(s => s.assignmentId === a.id)
    return !sub || sub.state === 'not_started' || sub.state === 'needs_revision'
  })
  const nextSub = nextAssignment
    ? submissions.find(s => s.assignmentId === nextAssignment.id)
    : undefined

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          My Workspace
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {displayName}{rollNumber ? ` · ${rollNumber}` : ''} ·{' '}
          <span className="font-mono text-xs">{githubUsername ?? 'GitHub not connected'}</span>
        </p>
      </div>

      {/* Next to do + active project */}
      <div className="flex gap-5 flex-col md:flex-row">
        {/* Next to do */}
        <Card className="flex-[2]">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <ArrowRight size={14} className="text-primary-bright" />
              Next to do
            </h2>
          </CardHeader>
          <CardContent>
            {nextAssignment ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'size-8 rounded-[var(--radius-control)] flex items-center justify-center shrink-0',
                    nextSub?.state === 'needs_revision' ? 'bg-warning/10' : 'bg-primary/10',
                  )}>
                    {nextSub?.state === 'needs_revision'
                      ? <CheckCircle2 size={16} className="text-warning" />
                      : <Calendar size={16} className="text-primary-bright" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{nextAssignment.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {nextSub?.state === 'needs_revision'
                        ? 'Revision requested — see faculty feedback'
                        : `Due ${new Date(nextAssignment.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                    </p>
                    {nextSub?.state === 'needs_revision' && (
                      <Badge variant="warning" className="mt-2">Revision requested</Badge>
                    )}
                  </div>
                </div>
                <EvidenceRail
                  stages={buildEvidenceStages({
                    assignmentTitle: nextAssignment.title,
                    repositoryApproval: githubConnectionState === 'healthy' ? 'approved' : 'proposed',
                    submissionState: nextSub?.state ?? 'not_started',
                    hasEvaluation: false,
                  })}
                  compact
                />
                <button
                  type="button"
                  onClick={() => navigate('/assignments')}
                  className="mt-1 text-sm text-primary-bright hover:underline flex items-center gap-1"
                >
                  Open assignment <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                <CheckCircle2 size={15} className="text-success" />
                All assignments submitted — nothing outstanding.
              </div>
            )}

            {githubConnectionState === 'not_connected' && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-[var(--radius-control)]">
                <p className="text-sm text-text-primary font-medium">Connect your GitHub account</p>
                <p className="text-xs text-text-muted mt-0.5">Link your account to start tracking academic activity in approved repositories.</p>
                <button
                  onClick={() => navigate('/settings?tab=github')}
                  className="mt-2 text-xs text-primary-bright hover:underline"
                >
                  Connect GitHub →
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active project */}
        <Card className="flex-[1]">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <GitBranch size={14} className="text-primary-bright" />
              Active Project
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoStudent.activeProjectName ? (
              <>
                <p className="text-base font-medium text-text-primary">{demoStudent.activeProjectName}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Assignments complete</span>
                    <span className="text-text-secondary tabular-nums">
                      {submissions.filter(s => s.state === 'reviewed').length} / {assignments.length}
                    </span>
                  </div>
                  <div className="h-1.5 bg-canvas-subtle rounded-full overflow-hidden border border-border" role="progressbar" aria-valuenow={Math.round((submissions.filter(s => s.state === 'reviewed').length / Math.max(1, assignments.length)) * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.round((submissions.filter(s => s.state === 'reviewed').length / Math.max(1, assignments.length)) * 100)}%`, backgroundColor: '#3FB950' }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {submissions.filter(s => s.state === 'reviewed').length} of {assignments.length} requirements complete
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className={cn('size-1.5 rounded-full', githubConnectionState === 'healthy' ? 'bg-success' : 'bg-warning')} />
                  Repository: {githubConnectionState === 'healthy' ? 'Approved & healthy' : 'Awaiting approval'}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">No active project assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap + streak side by side */}
      <div className="flex gap-5 flex-col xl:flex-row">
        <Card className="flex-[2]">
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

        {/* Streak */}
        <Card className="flex-[1] min-w-[260px]">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Flame size={14} className="text-warning" />
              Consistency
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {streak ? (
              <>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums text-text-primary">{streak.current}</p>
                    <p className="text-xs text-text-muted">current streak</p>
                  </div>
                  <div className="pb-1">
                    <p className="text-lg font-semibold tabular-nums text-text-secondary">{streak.longest}</p>
                    <p className="text-xs text-text-muted">longest</p>
                  </div>
                </div>

                {streak.lastQualifyingDate && (
                  <p className="text-xs text-text-muted">
                    Your last qualifying day was{' '}
                    <span className="text-text-secondary">
                      {new Date(streak.lastQualifyingDate + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                    </span>.
                  </p>
                )}

                <p className="text-[11px] text-text-muted">
                  Streak rule: ≥ 3 qualifying commits on a reporting day (Asia/Kolkata).
                  Streak reflects observed academic activity, not effort or expertise.
                </p>

                {/* Milestones */}
                {streak.milestones.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1.5 flex items-center gap-1"><Trophy size={11} /> Milestones reached</p>
                    <div className="flex flex-wrap gap-1.5">
                      {streak.milestones.map(m => (
                        <span key={m.id} className="text-[11px] px-2 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded-full">
                          {m.threshold}d · {m.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Development Tower */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Development Tower</h2>
            <p className="text-xs text-text-muted">Consistency milestones — not a measure of expertise</p>
          </div>
        </CardHeader>
        <CardContent>
          {streak ? (
            <DevelopmentTower streak={streak} />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </CardContent>
      </Card>

      {/* Recent feedback */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-text-primary">Recent Feedback</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {submissions.filter(s => s.state === 'reviewed').slice(0, 3).map(sub => {
            const asgn = DEMO_ASSIGNMENTS.find(a => a.id === sub.assignmentId)
            return (
              <div key={sub.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-text-secondary font-medium">{asgn?.title ?? 'Assignment'}</p>
                  <p className="text-xs text-text-muted mt-0.5">Reviewed · {sub.submittedAt ? relativeDate(sub.submittedAt) : ''}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/assignments')}
                    className="mt-1 text-xs text-primary-bright hover:underline"
                  >
                    View feedback →
                  </button>
                </div>
              </div>
            )
          })}
          {submissions.filter(s => s.state === 'reviewed').length === 0 && (
            <p className="text-sm text-text-muted">No reviewed assignments yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
