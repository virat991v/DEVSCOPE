/**
 * Student Assignments page + Submission form.
 * Shows assignments with states. Student submits evidence here.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, ChevronRight, Send, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { service } from '@/services'
import { DEMO_BATCHES } from '@/lib/demo-data'
import { useAuth } from '@/app/AuthContext'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EvidenceRail, buildEvidenceStages } from '@/features/submissions/EvidenceRail'
import type { Assignment, Submission } from '@/types'

const STATE_CFG: Record<Submission['state'], { label: string; variant: 'success' | 'info' | 'warning' | 'default' | 'danger' }> = {
  reviewed:       { label: 'Reviewed',        variant: 'success' },
  submitted:      { label: 'Submitted',        variant: 'info' },
  needs_revision: { label: 'Needs revision',  variant: 'warning' },
  draft:          { label: 'Draft',           variant: 'default' },
  not_started:    { label: 'Not started',     variant: 'default' },
}

interface SubmitModalProps {
  assignment: Assignment
  existing?: Submission
  onClose: () => void
  onSubmit: (data: { commitSha: string; summary: string; reflection: string }) => void
  loading: boolean
}

function SubmitModal({ assignment, existing, onClose, onSubmit, loading }: SubmitModalProps) {
  const [commitSha,  setCommitSha]  = useState(existing?.commitSha  ?? '')
  const [summary,    setSummary]    = useState(existing?.summary     ?? '')
  const [reflection, setReflection] = useState(existing?.reflection ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-subtle/80 p-4">
      <div className="w-full max-w-[520px] bg-surface border border-border rounded-[var(--radius-panel)] shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Submit — {assignment.title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit({ commitSha, summary, reflection }) }}
          className="p-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="commit-sha" className="text-xs font-medium text-text-secondary">
              Commit SHA or PR link <span className="text-danger">*</span>
            </label>
            <input
              id="commit-sha" type="text" required
              value={commitSha} onChange={e => setCommitSha(e.target.value)}
              placeholder="abc1234 or https://github.com/…/pull/1"
              className="w-full h-8 px-3 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
            <p className="text-[11px] text-text-muted">Link to the exact revision supporting this submission.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="summary" className="text-xs font-medium text-text-secondary">
              Implementation summary <span className="text-danger">*</span>
            </label>
            <textarea
              id="summary" required
              rows={3}
              value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="Briefly describe what you implemented…"
              className="w-full px-3 py-2 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-secondary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reflection" className="text-xs font-medium text-text-secondary">Reflection</label>
            <textarea
              id="reflection"
              rows={2}
              value={reflection} onChange={e => setReflection(e.target.value)}
              placeholder="What did you learn? What would you do differently?"
              className="w-full px-3 py-2 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-secondary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <p className="text-[11px] text-text-muted border-t border-border pt-3">
            Submitting does not guarantee authorship or completion. Evidence is reviewed by faculty.
          </p>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="h-8 px-4 bg-surface-raised border border-border text-sm text-text-secondary rounded-[var(--radius-control)] hover:border-border-strong transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !commitSha.trim() || !summary.trim()}
              className={cn(
                'flex items-center gap-1.5 h-8 px-4 bg-success-strong text-white text-sm font-medium rounded-[var(--radius-control)]',
                'border border-success-strong/80 hover:bg-success transition-colors disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {loading
                ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send size={13} /> Submit</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function StudentAssignmentsPage() {
  const { profile: authProfile } = useAuth()
  const qc = useQueryClient()
  const [modal, setModal] = useState<Assignment | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Resolve batchId — from real profile or fall back to demo
  const batchId = DEMO_BATCHES[1].id  // TODO: read from real batch_membership once that query exists

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', batchId],
    queryFn: () => service.getAssignments(batchId),
  })

  // My submissions for this student
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['my-submissions', authProfile?.id],
    queryFn: async () => {
      if (!authProfile?.id) return []
      // Fetch all submissions across the student's assignments
      const results = await Promise.all(
        (assignments).map(a => service.getSubmissions(a.id))
      )
      return results.flat().filter(s => s.studentId === authProfile.id)
    },
    enabled: !!authProfile?.id && assignments.length > 0,
  })

  const submitMutation = useMutation({
    mutationFn: (data: { commitSha: string; summary: string; reflection: string }) => {
      if (!modal) throw new Error('No assignment selected')
      return service.submitAssignment({
        assignmentId: modal.id,
        commitSha: data.commitSha,
        summary: data.summary,
        reflection: data.reflection,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-submissions', authProfile?.id] })
      qc.invalidateQueries({ queryKey: ['assignments', batchId] })
      setModal(null)
      setSubmitError(null)
    },
    onError: (err: Error) => {
      setSubmitError(err.message)
    },
  })

  function handleSubmit(data: { commitSha: string; summary: string; reflection: string }) {
    setSubmitError(null)
    submitMutation.mutate(data)
  }

  return (
    <div className="space-y-4 max-w-[900px]">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">My Assignments</h1>
        <p className="text-sm text-text-muted mt-1">Your assignments and submission status.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">No assignments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => {
            const sub = mySubmissions.find(s => s.assignmentId === a.id)
            const stages = buildEvidenceStages({
              assignmentTitle: a.title,
              repositoryApproval: 'approved',
              submissionState: sub?.state ?? 'not_started',
              hasEvaluation: sub?.state === 'reviewed',
            })
            const cfg = STATE_CFG[sub?.state ?? 'not_started']
            const canSubmit = sub?.state === 'not_started' || sub?.state === 'draft' || sub?.state === 'needs_revision'

            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-medium text-text-primary">{a.title}</h2>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={11} />
                        Due {new Date(a.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      {canSubmit && (
                        <button
                          onClick={() => setModal(a)}
                          className="flex items-center gap-1.5 h-7 px-3 bg-success-strong text-white text-xs font-medium rounded-[var(--radius-control)] border border-success-strong/80 hover:bg-success transition-colors"
                        >
                          <Send size={12} />
                          {sub?.state === 'needs_revision' ? 'Resubmit' : 'Submit'}
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-text-muted line-clamp-2">{a.description}</p>
                  <EvidenceRail stages={stages} compact />
                  {sub?.state === 'reviewed' && (
                    <Link to={`/assignments/${a.id}/feedback`}
                          className="text-xs text-primary-bright hover:underline flex items-center gap-1">
                      View feedback <ChevronRight size={11} />
                    </Link>
                  )}
                  {sub?.state === 'needs_revision' && (
                    <p className="text-xs text-warning">Revision requested by faculty — see feedback before resubmitting.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {modal && (
        <SubmitModal
          assignment={modal}
          existing={mySubmissions.find(s => s.assignmentId === modal.id)}
          onClose={() => { setModal(null); setSubmitError(null) }}
          onSubmit={handleSubmit}
          loading={submitMutation.isPending}
        />
      )}

      {submitError && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border border-danger/30 bg-surface text-sm text-danger shadow-lg">
          <AlertCircle size={14} className="shrink-0" />
          {submitError}
        </div>
      )}
    </div>
  )
}
