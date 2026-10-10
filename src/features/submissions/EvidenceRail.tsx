/**
 * Evidence Rail — compact, clickable sequence linking
 * assignment → repository → submission → evaluation.
 * Each stage displays a real state and opens the relevant record.
 */
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubmissionState, RepositoryApprovalState } from '@/types'

interface EvidenceStage {
  id: string
  label: string
  state: 'complete' | 'active' | 'pending' | 'error' | 'blocked'
  detail?: string
  linkPath?: string
}

interface EvidenceRailProps {
  stages: EvidenceStage[]
  compact?: boolean
}

const STATE_ICON = {
  complete: { Icon: CheckCircle2, cls: 'text-success' },
  active:   { Icon: Clock,        cls: 'text-primary-bright' },
  pending:  { Icon: Circle,       cls: 'text-text-muted' },
  error:    { Icon: AlertCircle,  cls: 'text-danger' },
  blocked:  { Icon: AlertCircle,  cls: 'text-warning' },
}

export function EvidenceRail({ stages, compact = false }: EvidenceRailProps) {
  return (
    <ol
      className={cn('flex items-start', compact ? 'gap-0' : 'gap-1 flex-wrap')}
      aria-label="Evidence stages"
    >
      {stages.map((stage, i) => {
        const { Icon, cls } = STATE_ICON[stage.state]
        return (
          <li key={stage.id} className="flex items-center">
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-[var(--radius-control)] transition-colors text-left',
                compact ? 'py-1 px-2' : 'py-1.5 px-3 border border-border bg-surface hover:border-border-strong',
                // Active: blue tint border + subtle bg
                stage.state === 'active' && 'border-primary/40 bg-primary/5',
                stage.state === 'complete' && 'opacity-80 hover:opacity-100',
              )}
              aria-label={`${stage.label}: ${stage.state}${stage.detail ? '. ' + stage.detail : ''}`}
            >
              <Icon size={13} className={cn(cls, 'shrink-0')} aria-hidden />
              <span className={cn(
                'text-xs font-medium',
                stage.state === 'active'   ? 'text-text-primary' :
                stage.state === 'complete' ? 'text-text-secondary' : 'text-text-muted',
              )}>
                {stage.label}
              </span>
              {stage.detail && !compact && (
                <span className="text-[10px] text-text-muted ml-1">({stage.detail})</span>
              )}
            </button>
            {i < stages.length - 1 && (
              <ChevronRight size={12} className="text-border-strong mx-0.5 shrink-0" aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function buildEvidenceStages(params: {
  assignmentTitle: string
  repositoryApproval: RepositoryApprovalState | null
  submissionState: SubmissionState
  hasEvaluation: boolean
}): EvidenceStage[] {
  const { repositoryApproval, submissionState, hasEvaluation } = params
  return [
    { id: 'assignment', label: 'Assignment', state: 'complete', detail: 'Published' },
    {
      id: 'repository', label: 'Repository',
      state: repositoryApproval === 'approved' ? 'complete'
           : repositoryApproval === 'proposed' ? 'active'
           : repositoryApproval === 'declined' ? 'error'
           : 'pending',
      detail: repositoryApproval ?? 'not linked',
    },
    {
      id: 'submission', label: 'Submission',
      state: submissionState === 'reviewed'       ? 'complete'
           : submissionState === 'submitted'      ? 'active'
           : submissionState === 'needs_revision' ? 'blocked'
           : submissionState === 'draft'          ? 'active'
           : 'pending',
      detail: submissionState.replace('_', ' '),
    },
    {
      id: 'evaluation', label: 'Evaluation',
      state: hasEvaluation ? 'complete' : submissionState === 'submitted' ? 'active' : 'pending',
      detail: hasEvaluation ? 'Published' : undefined,
    },
  ]
}
