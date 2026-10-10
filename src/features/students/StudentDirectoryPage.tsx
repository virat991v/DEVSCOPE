/**
 * Student Directory — server-side filtered, paginated list.
 * Faculty sees only students in assigned batches.
 * Default 25/page with 50/100 alternatives.
 */
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { service } from '@/services'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { relativeDate } from '@/lib/utils'
import type { Student } from '@/types'
import { useAuth } from '@/app/AuthContext'

const GH_BADGE: Record<Student['githubConnectionState'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  healthy:                     { label: 'Healthy',       variant: 'success' },
  degraded:                    { label: 'Degraded',      variant: 'warning' },
  not_connected:               { label: 'Not connected', variant: 'default' },
  authorization_pending:       { label: 'Auth pending',  variant: 'warning' },
  identity_connected:          { label: 'Connected',     variant: 'success' },
  installation_pending:        { label: 'Install…',      variant: 'warning' },
  repository_selection_pending:{ label: 'Select repo',   variant: 'warning' },
  initial_sync:                { label: 'Syncing',       variant: 'warning' },
  disconnected:                { label: 'Disconnected',  variant: 'danger' },
}

type SortKey = 'displayName' | 'currentStreak' | 'observedActivityLast30'
type SortDir = 'asc' | 'desc'

const PAGE_SIZES = [25, 50, 100]

export function StudentDirectoryPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortKey, setSortKey] = useState<SortKey>('displayName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { data: allBatches = [], isLoading: batchesLoading, error: batchesError, refetch: refetchBatches } = useQuery({
    queryKey: ['faculty-batches', profile?.id],
    queryFn: () => service.getBatches(),
    enabled: Boolean(profile?.id),
  })
  const batches = allBatches.filter(batch => !profile?.id || batch.facultyIds.includes(profile.id))
  const batchId = batches.some(batch => batch.id === selectedBatchId)
    ? selectedBatchId
    : (batches[0]?.id ?? '')
  const batch = batches.find(candidate => candidate.id === batchId)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', batchId],
    queryFn: () => service.getStudents(batchId),
    enabled: Boolean(batchId),
  })

  // Client-side filter + sort (server-side in production via Supabase queries)
  const filtered = students
    .filter(s =>
      !search ||
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string' && typeof vb === 'string')
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      if (typeof va === 'number' && typeof vb === 'number')
        return sortDir === 'asc' ? va - vb : vb - va
      return 0
    })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  if (batchesLoading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-72 w-full" /></div>
  }

  if (batchesError) {
    return (
      <Card className="max-w-xl">
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-text-secondary">Your assigned batches could not be loaded.</p>
          <button type="button" onClick={() => void refetchBatches()} className="h-8 px-3 rounded border border-border text-sm text-text-secondary hover:text-text-primary">Retry</button>
        </CardContent>
      </Card>
    )
  }

  if (!batch) {
    return (
      <Card className="max-w-xl">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-text-secondary">No academic batch is assigned to your faculty account.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Students</h1>
          <p className="text-sm text-text-muted mt-1">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Batch filter */}
          <div className="relative">
            <select
              value={batchId}
              onChange={e => { setSelectedBatchId(e.target.value); setPage(1) }}
              className="appearance-none h-8 px-3 pr-7 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary focus:outline-none focus:border-primary/60"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name, roll, email…"
              aria-label="Search students"
              className="h-8 pl-8 pr-3 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 w-56"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {batch.label} — Students
            </span>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Rows:</span>
              {PAGE_SIZES.map(n => (
                <button
                  key={n}
                  onClick={() => { setPageSize(n); setPage(1) }}
                  className={pageSize === n ? 'text-primary-bright font-medium' : 'hover:text-text-secondary'}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : paged.length === 0 ? (
            <CardContent>
              <p className="text-sm text-text-muted text-center py-6">
                {search ? 'No students match your search.' : 'No students enrolled in this batch.'}
              </p>
            </CardContent>
          ) : (
            <table className="w-full min-w-[700px] text-sm" aria-label="Student list">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { label: 'Student', key: 'displayName' as SortKey },
                    { label: 'GitHub', key: null },
                    { label: 'Activity (30d)', key: 'observedActivityLast30' as SortKey },
                    { label: 'Streak', key: 'currentStreak' as SortKey },
                    { label: 'Last event', key: null },
                    { label: 'Coverage', key: null },
                  ].map(h => (
                    <th
                      key={h.label}
                      className={`py-2 px-3 text-left text-xs font-medium text-text-muted whitespace-nowrap ${h.key ? 'cursor-pointer hover:text-text-secondary select-none' : ''}`}
                      onClick={h.key ? () => toggleSort(h.key!) : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {h.label}
                        {h.key && <SortIcon k={h.key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(s => {
                  const gh = GH_BADGE[s.githubConnectionState]
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-surface-raised transition-colors cursor-pointer"
                      onClick={() => navigate(`/students/${s.id}`)}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={s.avatarInitials} size="sm" />
                          <div>
                            <p className="text-sm text-text-primary font-medium leading-tight">{s.displayName}</p>
                            <p className="text-[11px] text-text-muted font-mono">{s.rollNumber}</p>
                          </div>
                          {s.attentionItems.length > 0 && (
                            <AlertTriangle size={12} className="text-warning shrink-0" aria-label="Attention items" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={gh.variant}>{gh.label}</Badge>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-sm text-text-secondary">
                        {s.observedActivityLast30 > 0 ? s.observedActivityLast30 : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-sm">
                        {s.currentStreak > 0
                          ? <span className="text-text-primary">{s.currentStreak}d</span>
                          : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-text-muted">
                        {s.lastObservedEvent ? relativeDate(s.lastObservedEvent) : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={s.coverageState === 'healthy' ? 'success' : s.coverageState === 'stale' ? 'warning' : 'default'}>
                          {s.coverageState.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded border border-border hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded border border-border hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
