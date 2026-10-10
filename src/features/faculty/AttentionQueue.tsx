/**
 * Faculty Attention Queue — deterministic, actionable items.
 * Distinguishes academic problems from data availability problems.
 */
import { AlertCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AttentionItem } from '@/types'
import { relativeDate } from '@/lib/utils'

interface AttentionQueueProps {
  items: AttentionItem[]
  maxVisible?: number
}

const SEVERITY_ICON = {
  error:   { Icon: AlertCircle,  cls: 'text-danger' },
  warning: { Icon: AlertTriangle, cls: 'text-warning' },
  info:    { Icon: Info,          cls: 'text-primary-bright' },
}

const REASON_TYPE: Record<AttentionItem['reason'], 'academic' | 'data'> = {
  overdue_submission:      'academic',
  review_pending:          'academic',
  no_activity:             'academic',
  github_broken:           'data',
  repository_access_lost:  'data',
  stale_sync:              'data',
}

function TypePill({ type }: { type: 'academic' | 'data' }) {
  return (
    <span className={cn(
      'text-[10px] px-1.5 py-0.5 rounded font-medium border',
      type === 'academic'
        // Warning amber for academic issues
        ? 'bg-warning/10 text-warning border-warning/25'
        // Blue for data/integration issues
        : 'bg-primary/10 text-primary-bright border-primary/20',
    )}>
      {type === 'academic' ? 'Academic' : 'Data'}
    </span>
  )
}

export function AttentionQueue({ items, maxVisible = 8 }: AttentionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-text-muted">
        <span className="size-4 rounded-full bg-success/15 border border-success/25 flex items-center justify-center">
          <span className="size-2 rounded-full bg-success" />
        </span>
        No attention items — all caught up.
      </div>
    )
  }

  const visible = items.slice(0, maxVisible)
  const remaining = items.length - visible.length

  return (
    <div role="list" aria-label="Attention items">
      {visible.map(item => {
        const { Icon, cls } = SEVERITY_ICON[item.severity]
        const type = REASON_TYPE[item.reason]
        return (
          <div
            key={item.id}
            role="listitem"
            className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0 group"
          >
            <Icon size={15} className={cn('mt-0.5 shrink-0', cls)} aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-text-primary font-medium">{item.label}</span>
                <TypePill type={type} />
              </div>
              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{item.detail}</p>
              <p className="text-[11px] text-text-disabled mt-0.5">{relativeDate(item.createdAt)}</p>
            </div>
            <button
              className="shrink-0 size-7 flex items-center justify-center rounded-[var(--radius-control)] text-text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-raised hover:text-text-primary transition-all"
              aria-label={`Open: ${item.label}`}
            >
              <ExternalLink size={13} />
            </button>
          </div>
        )
      })}
      {remaining > 0 && (
        <p className="text-xs text-text-muted pt-2">
          + {remaining} more attention items
        </p>
      )}
    </div>
  )
}
