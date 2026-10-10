/**
 * RepositoryApprovalPanel
 *
 * Faculty/admin panel to review proposed repositories and approve or decline them.
 * Shown within ProjectDetailPage or AssignmentDetailPage.
 *
 * States: proposed → approved (starts sync) | declined (with reason)
 * Approved repos can be disconnected/archived later.
 */
import { useState } from 'react'
import { GitBranch, CheckCircle, XCircle, Clock, AlertCircle, Lock, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { approveRepository, declineRepository } from '@/services/github'
import type { RepositoryProposal } from '@/services/github'

interface Props {
  repositories: RepositoryProposal[]
  approverId: string
  canApprove: boolean   // false for students
  isDemo?: boolean
  onUpdate?: () => void
}

const APPROVAL_BADGES: Record<RepositoryProposal['approvalState'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  proposed:    { label: 'Proposed',    variant: 'warning' },
  approved:    { label: 'Approved',    variant: 'success' },
  declined:    { label: 'Declined',    variant: 'danger' },
  disconnected:{ label: 'Disconnected',variant: 'default' },
  archived:    { label: 'Archived',    variant: 'default' },
}

const COVERAGE_LABELS = {
  healthy:        { label: 'Healthy',         color: 'text-success' },
  pending_import: { label: 'Importing…',      color: 'text-warning' },
  stale:          { label: 'Stale',           color: 'text-warning' },
  disconnected:   { label: 'Disconnected',    color: 'text-danger' },
  unavailable:    { label: 'Unavailable',     color: 'text-text-muted' },
}

export function RepositoryApprovalPanel({ repositories, approverId, canApprove, isDemo = false, onUpdate }: Props) {
  const [actionState, setActionState] = useState<Record<string, 'loading' | 'done' | 'error'>>({})
  const [declineTarget, setDeclineTarget] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleApprove(repoId: string) {
    if (isDemo) { setError('Approval is disabled in demo mode.'); return }
    setActionState(s => ({ ...s, [repoId]: 'loading' }))
    const result = await approveRepository(repoId, approverId)
    if (result.ok) {
      setActionState(s => ({ ...s, [repoId]: 'done' }))
      onUpdate?.()
    } else {
      setActionState(s => ({ ...s, [repoId]: 'error' }))
      setError(result.error ?? 'Approval failed.')
    }
  }

  async function handleDeclineSubmit(repoId: string) {
    if (isDemo) { setError('Decline is disabled in demo mode.'); return }
    if (!declineReason.trim()) { setError('Please provide a reason.'); return }
    setActionState(s => ({ ...s, [repoId]: 'loading' }))
    const result = await declineRepository(repoId, declineReason.trim())
    if (result.ok) {
      setActionState(s => ({ ...s, [repoId]: 'done' }))
      setDeclineTarget(null)
      setDeclineReason('')
      onUpdate?.()
    } else {
      setActionState(s => ({ ...s, [repoId]: 'error' }))
      setError(result.error ?? 'Decline failed.')
    }
  }

  if (!repositories.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <GitBranch size={20} className="mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-muted">No repositories proposed for this project.</p>
          {!canApprove && (
            <p className="text-xs text-text-disabled mt-1">Connect your GitHub account and select a repository in settings.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-text-primary">Repositories</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-xs text-danger flex items-start gap-1.5">
            <XCircle size={13} className="shrink-0 mt-0.5" />{error}
          </p>
        )}
        {repositories.map(repo => {
          const approval = APPROVAL_BADGES[repo.approvalState]
          const coverage = repo.approvalState === 'approved' ? COVERAGE_LABELS[repo.coverageState] : null
          const isLoading = actionState[repo.id] === 'loading'
          const isDone    = actionState[repo.id] === 'done'

          return (
            <div
              key={repo.id}
              className="flex flex-col gap-2 p-3 bg-surface-raised border border-border rounded-[var(--radius-control)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {repo.isPrivate ? <Lock size={13} className="text-text-muted shrink-0" /> : <Globe size={13} className="text-text-muted shrink-0" />}
                  <span className="text-sm font-mono text-text-primary truncate">{repo.fullName}</span>
                </div>
                <Badge variant={approval.variant}>{approval.label}</Badge>
              </div>

              {/* Coverage state (approved repos only) */}
              {coverage && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock size={11} className={coverage.color} />
                  <span className={coverage.color}>{coverage.label}</span>
                  {repo.lastSyncAt && (
                    <span className="text-text-muted">— last sync {new Date(repo.lastSyncAt).toLocaleString()}</span>
                  )}
                </div>
              )}

              {/* Decline reason */}
              {repo.approvalState === 'declined' && repo.declineReason && (
                <p className="text-xs text-danger flex items-start gap-1">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  {repo.declineReason}
                </p>
              )}

              {/* Faculty actions — proposed repos only */}
              {canApprove && repo.approvalState === 'proposed' && !isDone && (
                declineTarget === repo.id ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">Reason for declining</label>
                    <input
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      placeholder="e.g. Not the correct repository for this assignment"
                      className="w-full h-7 px-2 bg-canvas border border-border rounded text-xs text-text-primary focus:outline-none focus:border-primary/60"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeclineSubmit(repo.id)}
                        disabled={isLoading}
                        className="h-7 px-3 bg-danger/90 text-white text-xs font-medium rounded hover:bg-danger transition-colors disabled:opacity-50"
                      >
                        {isLoading ? '…' : 'Decline'}
                      </button>
                      <button
                        onClick={() => { setDeclineTarget(null); setDeclineReason('') }}
                        className="h-7 px-3 bg-surface border border-border text-xs text-text-secondary rounded hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(repo.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1 h-7 px-3 bg-success-strong text-white text-xs font-medium rounded hover:bg-success transition-colors disabled:opacity-50"
                    >
                      {isLoading ? <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={12} />}
                      Approve
                    </button>
                    <button
                      onClick={() => setDeclineTarget(repo.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1 h-7 px-3 bg-surface border border-border text-xs text-danger rounded hover:border-danger/30 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} />Decline
                    </button>
                  </div>
                )
              )}

              {isDone && (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle size={12} /> Updated
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
