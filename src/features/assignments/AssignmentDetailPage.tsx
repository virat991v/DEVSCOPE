/**
 * Assignment Detail / Faculty Review Workspace.
 * Three-column layout where width permits:
 *  Left: submission list  |  Centre: submission detail  |  Right: rubric + feedback
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft, CheckCircle2, Clock, FileText, MessageSquare, Star,
  RotateCcw, Send, AlertCircle,
} from 'lucide-react'
import { cn, relativeDate } from '@/lib/utils'
import { service } from '@/services'
import { useAuth } from '@/app/AuthContext'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Submission } from '@/types'

// ─── Submission state badge ───────────────────────────────

const STATE_CFG: Record<Submission['state'], { label: string; variant: 'success' | 'info' | 'warning' | 'default' | 'danger' }> = {
  reviewed:       { label: 'Reviewed',        variant: 'success' },
  submitted:      { label: 'Awaiting review', variant: 'info' },
  needs_revision: { label: 'Needs revision',  variant: 'warning' },
  draft:          { label: 'Draft',           variant: 'default' },
  not_started:    { label: 'Not started',     variant: 'default' },
}

// ─── Rubric scoring panel ─────────────────────────────────

interface RubricPanelProps {
  criteria: Array<{ id: string; label: string; description: string; maxPoints: number }>
  scores: Record<string, number>
  comments: Record<string, string>
  onScore: (id: string, val: number) => void
  onComment: (id: string, val: string) => void
  feedback: string
  onFeedback: (v: string) => void
}

function RubricPanel({ criteria, scores, comments, onScore, onComment, feedback, onFeedback }: RubricPanelProps) {
  const total    = criteria.reduce((s, c) => s + (scores[c.id] ?? 0), 0)
  const maxTotal = criteria.reduce((s, c) => s + c.maxPoints, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Rubric</h3>
        <span className="text-sm tabular-nums text-text-secondary font-medium">{total} / {maxTotal}</span>
      </div>

      {criteria.map(c => (
        <div key={c.id} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-primary">{c.label}</p>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={c.maxPoints}
                value={scores[c.id] ?? 0}
                onChange={e => onScore(c.id, Math.min(c.maxPoints, Math.max(0, +e.target.value)))}
                className="w-12 h-6 text-center bg-canvas border border-border rounded text-xs text-text-primary focus:outline-none focus:border-primary/60"
                aria-label={`Score for ${c.label}`}
              />
              <span className="text-[11px] text-text-muted">/{c.maxPoints}</span>
            </div>
          </div>
          <p className="text-[11px] text-text-muted">{c.description}</p>
          <input
            type="text"
            value={comments[c.id] ?? ''}
            onChange={e => onComment(c.id, e.target.value)}
            placeholder="Optional comment…"
            className="w-full h-7 px-2 bg-canvas border border-border/50 rounded text-xs text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-border"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-primary" htmlFor="overall-feedback">Overall feedback</label>
        <textarea
          id="overall-feedback"
          rows={4}
          value={feedback}
          onChange={e => onFeedback(e.target.value)}
          placeholder="Write feedback visible to the student after publishing…"
          className="w-full px-2.5 py-2 bg-canvas border border-border rounded-[var(--radius-control)] text-xs text-text-secondary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
        />
        <p className="text-[10px] text-text-muted">Feedback is only visible to the student after you publish the evaluation.</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────

export function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { profile: authProfile } = useAuth()
  const qc = useQueryClient()

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [scores,   setScores]   = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')

  const { data: assignment, isLoading: assignmentLoading, error: assignmentError } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => service.getAssignment(assignmentId ?? ''),
    enabled: Boolean(assignmentId),
  })

  const { data: batchStudents = [] } = useQuery({
    queryKey: ['students', assignment?.batchId],
    queryFn: () => service.getStudents(assignment!.batchId),
    enabled: Boolean(assignment?.batchId),
  })
  const studentsById = useMemo(
    () => new Map(batchStudents.map(student => [student.id, student])),
    [batchStudents],
  )

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions', assignment?.id],
    queryFn: () => service.getSubmissions(assignment!.id),
    enabled: Boolean(assignment?.id),
  })

  const selectedSub = submissions.find(s => s.id === selectedSubId)

  const { data: evaluation } = useQuery({
    queryKey: ['evaluation', selectedSubId],
    queryFn: () => service.getEvaluation(selectedSubId!),
    enabled: !!selectedSubId,
  })

  function selectSubmission(sub: Submission) {
    setSelectedSubId(sub.id)
    setFeedback(evaluation?.feedback ?? '')
    setScores(Object.fromEntries((evaluation?.criterionResults ?? []).map(r => [r.criterionId, r.score])))
    setComments(Object.fromEntries((evaluation?.criterionResults ?? []).map(r => [r.criterionId, r.comment ?? ''])))
    setActionMsg('')
    setActionErr('')
  }

  function flash(msg: string, isErr = false) {
    if (isErr) { setActionErr(msg); setTimeout(() => setActionErr(''), 3000) }
    else       { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2500) }
  }

  const saveDraftMutation = useMutation({
    mutationFn: () => service.saveEvaluation({
      submissionId: selectedSub!.id,
      facultyId: authProfile?.id ?? '',
      scores, comments, feedback,
      publish: false,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluation', selectedSubId] })
      flash('Draft saved')
    },
    onError: (e: Error) => flash(e.message, true),
  })

  const publishMutation = useMutation({
    mutationFn: () => service.saveEvaluation({
      submissionId: selectedSub!.id,
      facultyId: authProfile?.id ?? '',
      scores, comments, feedback,
      publish: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions', assignment?.id] })
      qc.invalidateQueries({ queryKey: ['evaluation', selectedSubId] })
      flash('Evaluation published ✓')
    },
    onError: (e: Error) => flash(e.message, true),
  })

  const revisionMutation = useMutation({
    mutationFn: () => service.requestRevision(selectedSub!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions', assignment?.id] })
      flash('Revision requested')
    },
    onError: (e: Error) => flash(e.message, true),
  })

  const saving = saveDraftMutation.isPending || publishMutation.isPending || revisionMutation.isPending
  const saveMsg = actionMsg

  const submitted = submissions.filter(s => s.state === 'submitted').length
  const reviewed  = submissions.filter(s => s.state === 'reviewed').length

  if (assignmentLoading) {
    return <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-[520px] w-full" /></div>
  }

  if (assignmentError || !assignment) {
    return (
      <Card className="max-w-xl">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-sm font-medium text-text-primary">Assignment unavailable</p>
          <p className="text-xs text-text-muted">This assignment does not exist or your faculty account does not have access to its batch.</p>
          <Link to="/assignments" className="text-sm text-primary-bright hover:underline">Back to assignments</Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header */}
      <div>
        <Link to="/assignments" className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary mb-2 w-fit">
          <ChevronLeft size={13} /> Assignments
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{assignment.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
              <span className="capitalize">{assignment.mode}</span>
              <span className="text-text-disabled">·</span>
              <span>Due {new Date(assignment.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="text-text-disabled">·</span>
              <span>{submitted} awaiting review · {reviewed} reviewed</span>
            </div>
          </div>
          <Badge variant={assignment.state === 'published' ? 'success' : 'default'}>
            {assignment.state}
          </Badge>
        </div>
      </div>

      {/* Three-column workspace */}
      <div className="flex gap-4 flex-col lg:flex-row min-h-[600px]">
        {/* Left: submission list */}
        <aside className="w-full lg:w-[220px] shrink-0 space-y-1">
          <p className="text-xs text-text-muted font-medium mb-2 px-1">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </p>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            : submissions.map(sub => {
                const student = studentsById.get(sub.studentId)
                const cfg = STATE_CFG[sub.state]
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-control)] text-left transition-colors border',
                      selectedSubId === sub.id
                        ? 'bg-primary/8 border-primary/25'
                        : 'bg-surface border-border hover:border-border-strong',
                    )}
                  >
                    <Avatar initials={student?.avatarInitials ?? '??'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{student?.displayName ?? sub.studentId}</p>
                      <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0 mt-0.5">{cfg.label}</Badge>
                    </div>
                  </button>
                )
              })}
        </aside>

        {/* Centre: submission detail */}
        <div className="flex-1 min-w-0">
          {!selectedSub ? (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <FileText size={24} className="text-text-muted mb-2" />
                <p className="text-sm text-text-secondary">Select a submission to review</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar initials={studentsById.get(selectedSub.studentId)?.avatarInitials ?? '??'} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {studentsById.get(selectedSub.studentId)?.displayName ?? 'Student'}
                      </p>
                      {selectedSub.submittedAt && (
                        <p className="text-xs text-text-muted flex items-center gap-1">
                          <Clock size={10} /> Submitted {relativeDate(selectedSub.submittedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATE_CFG[selectedSub.state].variant}>
                    {STATE_CFG[selectedSub.state].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSub.commitSha && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Commit SHA</p>
                    <p className="text-xs font-mono text-primary-bright bg-canvas-subtle px-2 py-1 rounded border border-border">
                      {selectedSub.commitSha}
                    </p>
                  </div>
                )}
                {selectedSub.prUrl && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Pull request</p>
                    <a href={selectedSub.prUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary-bright hover:underline break-all">
                      {selectedSub.prUrl}
                    </a>
                  </div>
                )}
                {selectedSub.summary && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Implementation summary</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{selectedSub.summary}</p>
                  </div>
                )}
                {selectedSub.reflection && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Reflection</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{selectedSub.reflection}</p>
                  </div>
                )}

                {/* Existing evaluation */}
                {evaluation && !evaluation.draft && (
                  <div className="bg-success/5 border border-success/20 rounded-[var(--radius-control)] p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                      <CheckCircle2 size={13} /> Evaluation published
                    </div>
                    <p className="text-xs text-text-secondary">{evaluation.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: rubric panel */}
        {selectedSub && (
          <aside className="w-full lg:w-[280px] shrink-0">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Star size={14} className="text-warning" />
                  Evaluate
                </h2>
              </CardHeader>
              <CardContent>
                <RubricPanel
                  criteria={assignment.rubricCriteria}
                  scores={scores}
                  comments={comments}
                  onScore={(id, v) => setScores(s => ({ ...s, [id]: v }))}
                  onComment={(id, v) => setComments(c => ({ ...c, [id]: v }))}
                  feedback={feedback}
                  onFeedback={setFeedback}
                />

                {saveMsg && <p className="text-xs text-success mt-2">{saveMsg}</p>}
                {actionErr && (
                  <div className="flex items-center gap-1.5 text-xs text-danger mt-2">
                    <AlertCircle size={12} /> {actionErr}
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={() => saveDraftMutation.mutate()}
                    disabled={saving || !selectedSub}
                    className="flex items-center justify-center gap-1.5 h-8 w-full bg-surface-raised border border-border rounded-[var(--radius-control)] text-sm text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors disabled:opacity-50"
                  >
                    <MessageSquare size={13} /> Save draft
                  </button>
                  <button
                    onClick={() => revisionMutation.mutate()}
                    disabled={saving || !selectedSub}
                    className="flex items-center justify-center gap-1.5 h-8 w-full bg-warning/10 border border-warning/25 rounded-[var(--radius-control)] text-sm text-warning hover:bg-warning/15 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={13} /> Request revision
                  </button>
                  <button
                    onClick={() => publishMutation.mutate()}
                    disabled={saving || !feedback.trim() || !selectedSub}
                    className="flex items-center justify-center gap-1.5 h-8 w-full bg-success-strong border border-success-strong/80 rounded-[var(--radius-control)] text-sm text-white hover:bg-success transition-colors disabled:opacity-50"
                  >
                    {saving
                      ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><Send size={13} /> Publish evaluation</>}
                  </button>
                </div>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  )
}
