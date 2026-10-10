/**
 * IntegrationHealthPage
 *
 * Admin view: GitHub App installation state, sync job health,
 * webhook receipt log, and retry controls.
 * Route: /integrations
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity, AlertCircle, CheckCircle, Clock, RefreshCw,
  XCircle, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { getIntegrationHealth } from '@/services/github'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { SyncJobSummary, WebhookReceiptSummary } from '@/services/github'

// Demo data for when Supabase is not configured
const DEMO_JOBS: SyncJobSummary[] = [
  { id: 'j1', jobType: 'webhook_push',           state: 'done',        retryCount: 0, maxRetries: 5, createdAt: new Date(Date.now() - 120_000).toISOString(), completedAt: new Date(Date.now() - 118_000).toISOString() },
  { id: 'j2', jobType: 'webhook_pull_request',    state: 'done',        retryCount: 0, maxRetries: 5, createdAt: new Date(Date.now() - 300_000).toISOString(), completedAt: new Date(Date.now() - 298_000).toISOString() },
  { id: 'j3', jobType: 'backfill_repository',     state: 'processing',  retryCount: 0, maxRetries: 5, createdAt: new Date(Date.now() - 60_000).toISOString() },
  { id: 'j4', jobType: 'reconcile_installation',  state: 'failed',      retryCount: 3, maxRetries: 5, createdAt: new Date(Date.now() - 600_000).toISOString(), errorMessage: 'GitHub API rate limit exceeded. Next retry in 120s.' },
  { id: 'j5', jobType: 'webhook_issues',          state: 'dead_letter', retryCount: 5, maxRetries: 5, createdAt: new Date(Date.now() - 1800_000).toISOString(), errorMessage: 'Repository not found in approved scope.' },
]

const DEMO_RECEIPTS: WebhookReceiptSummary[] = [
  { id: 'r1', deliveryId: 'a1b2c3d4-0001', eventType: 'push',          action: undefined,  processingState: 'processed', receivedAt: new Date(Date.now() - 120_000).toISOString() },
  { id: 'r2', deliveryId: 'a1b2c3d4-0002', eventType: 'pull_request',  action: 'opened',   processingState: 'processed', receivedAt: new Date(Date.now() - 300_000).toISOString() },
  { id: 'r3', deliveryId: 'a1b2c3d4-0003', eventType: 'issues',        action: 'closed',   processingState: 'processed', receivedAt: new Date(Date.now() - 420_000).toISOString() },
  { id: 'r4', deliveryId: 'a1b2c3d4-0004', eventType: 'push',          action: undefined,  processingState: 'received',  receivedAt: new Date(Date.now() - 25_000).toISOString() },
]

const JOB_STATE_DISPLAY: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: typeof CheckCircle }> = {
  pending:     { label: 'Pending',     variant: 'warning', icon: Clock },
  claimed:     { label: 'Claimed',     variant: 'warning', icon: Clock },
  processing:  { label: 'Processing',  variant: 'warning', icon: RefreshCw },
  done:        { label: 'Done',        variant: 'success', icon: CheckCircle },
  failed:      { label: 'Failed',      variant: 'danger',  icon: AlertCircle },
  dead_letter: { label: 'Dead letter', variant: 'danger',  icon: XCircle },
}

const RECEIPT_STATE_DISPLAY: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  received:    { variant: 'warning' },
  processing:  { variant: 'warning' },
  processed:   { variant: 'success' },
  failed:      { variant: 'danger' },
  dead_letter: { variant: 'danger' },
  ignored:     { variant: 'default' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`
  return `${Math.round(diff / 3600_000)}h ago`
}

export function IntegrationHealthPage() {
  const qc = useQueryClient()
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  // Use demo data when Supabase not configured
  const { data: health, isLoading } = useQuery({
    queryKey: ['integration-health'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return {
          connectionState: 'healthy' as const,
          githubLogin: undefined,
          lastSyncAt: new Date(Date.now() - 120_000).toISOString(),
          installations: [],
          recentJobs: DEMO_JOBS,
          recentReceipts: DEMO_RECEIPTS,
          pendingJobCount:  1,
          failedJobCount:   1,
          deadLetterCount:  1,
        }
      }
      // For real mode, institutionId comes from context; using placeholder here
      return getIntegrationHealth('placeholder')
    },
    refetchInterval: 30_000,
  })

  // Retry failed jobs mutation
  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) return
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (v: Record<string, unknown>) => {
            in: (c: string, v: string[]) => Promise<void>
          }
        }
      }
      await sb.from('sync_jobs').update({ state: 'pending', next_retry_at: null }).in('state', ['failed'])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration-health'] }),
  })

  const jobs     = health?.recentJobs     ?? []
  const receipts = health?.recentReceipts ?? []

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Integration Health</h1>
          <p className="text-sm text-text-muted mt-1">GitHub App installation state, sync jobs, and webhook receipts.</p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['integration-health'] })}
          className="flex items-center gap-1.5 h-8 px-3 bg-surface-raised border border-border text-sm text-text-secondary rounded-[var(--radius-control)] hover:text-text-primary transition-colors"
        >
          <RefreshCw size={13} />Refresh
        </button>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending jobs',    value: health?.pendingJobCount  ?? 0, color: 'text-warning' },
          { label: 'Failed jobs',     value: health?.failedJobCount   ?? 0, color: 'text-danger' },
          { label: 'Dead letters',    value: health?.deadLetterCount  ?? 0, color: 'text-danger' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="py-3">
              <p className={cn('text-2xl font-semibold tabular-nums', item.color)}>{item.value}</p>
              <p className="text-xs text-text-muted">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Retry action */}
      {(health?.failedJobCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-danger/5 border border-danger/20 rounded-[var(--radius-control)]">
          <AlertCircle size={14} className="text-danger shrink-0" />
          <p className="text-sm text-text-secondary flex-1">
            {health!.failedJobCount} failed job{health!.failedJobCount !== 1 ? 's' : ''} eligible for retry.
          </p>
          <button
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending || !isSupabaseConfigured}
            className="flex items-center gap-1.5 h-7 px-3 bg-danger/90 text-white text-xs font-medium rounded hover:bg-danger transition-colors disabled:opacity-50"
          >
            {retryMutation.isPending
              ? <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <RefreshCw size={12} />}
            Retry all
          </button>
        </div>
      )}

      {/* Recent sync jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">Recent sync jobs</h2>
            <span className="text-xs text-text-muted">(latest 20)</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : jobs.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">No sync jobs recorded.</p>
          ) : (
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2">Type</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2">State</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2 hidden sm:table-cell">Retries</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const s = JOB_STATE_DISPLAY[job.state] ?? JOB_STATE_DISPLAY.pending
                  const Icon = s.icon
                  const expanded = expandedJob === job.id
                  return (
                    <>
                      <tr
                        key={job.id}
                        className={cn('border-b border-border/50 hover:bg-surface-raised/50 cursor-pointer', job.errorMessage && 'cursor-pointer')}
                        onClick={() => setExpandedJob(expanded ? null : job.id)}
                      >
                        <td className="px-4 py-2 font-mono text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            {job.errorMessage && (
                              expanded ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />
                            )}
                            {job.jobType}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-1">
                            <Icon size={12} className={s.variant === 'success' ? 'text-success' : s.variant === 'danger' ? 'text-danger' : 'text-warning'} />
                            <Badge variant={s.variant} className="text-[11px]">{s.label}</Badge>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-text-muted tabular-nums hidden sm:table-cell">
                          {job.retryCount}/{job.maxRetries}
                        </td>
                        <td className="px-4 py-2 text-xs text-text-muted">{relativeTime(job.createdAt)}</td>
                      </tr>
                      {expanded && job.errorMessage && (
                        <tr key={`${job.id}-err`} className="border-b border-border/50 bg-surface-raised/30">
                          <td colSpan={4} className="px-6 pb-3 pt-1">
                            <p className="text-xs text-danger font-mono break-all">{job.errorMessage}</p>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Webhook receipts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">Webhook receipts</h2>
            <span className="text-xs text-text-muted">(latest 20)</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : receipts.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">No webhook receipts recorded.</p>
          ) : (
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2">Event</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2">State</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2 hidden sm:table-cell">Delivery ID</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-2">Received</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => {
                  const s = RECEIPT_STATE_DISPLAY[r.processingState] ?? { variant: 'default' as const }
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-text-secondary">{r.eventType}</span>
                        {r.action && <span className="ml-1 text-xs text-text-muted">({r.action})</span>}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={s.variant} className="text-[11px]">{r.processingState}</Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-text-muted truncate max-w-[120px] hidden sm:table-cell">
                        {r.deliveryId}
                      </td>
                      <td className="px-4 py-2 text-xs text-text-muted">{relativeTime(r.receivedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {!isSupabaseConfigured && (
        <p className="text-xs text-text-muted text-center">
          Showing demo data. Connect Supabase to see live integration health.
        </p>
      )}
    </div>
  )
}
