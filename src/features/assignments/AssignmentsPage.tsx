/**
 * Assignments page — faculty view.
 * Tabs: Upcoming, In Progress, Submitted (awaiting review), Closed.
 * Links to assignment detail / review workspace.
 */
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { service } from '@/services'
import { useAuth } from '@/app/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Assignment } from '@/types'

type TabId = 'upcoming' | 'active' | 'closed' | 'draft'

function assignmentTab(a: Assignment): TabId {
  if (a.state === 'draft') return 'draft'
  if (a.state === 'closed') return 'closed'
  const now = new Date()
  const dl  = new Date(a.deadline)
  return dl > now ? 'upcoming' : 'active'
}

function DeadlinePill({ deadline, state }: { deadline: string; state: Assignment['state'] }) {
  if (state !== 'published') return null
  const dl   = new Date(deadline)
  const now  = new Date()
  const days = Math.ceil((dl.getTime() - now.getTime()) / 86_400_000)
  if (days < 0) return <Badge variant="danger">Past due</Badge>
  if (days === 0) return <Badge variant="warning">Due today</Badge>
  if (days <= 3)  return <Badge variant="warning">Due in {days}d</Badge>
  return <span className="text-xs text-text-muted">{dl.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
}

export function AssignmentsPage() {
  const { profile } = useAuth()
  const facultyId = profile?.id ?? ''
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [tab, setTab] = useState<TabId>('upcoming')

  const { data: allBatches = [], isLoading: batchesLoading, error: batchesError, refetch: refetchBatches } = useQuery({
    queryKey: ['faculty-batches', facultyId],
    queryFn: () => service.getBatches(),
    enabled: Boolean(facultyId),
  })
  const batches = allBatches.filter(batch => !facultyId || batch.facultyIds.includes(facultyId))
  const batchId = batches.some(batch => batch.id === selectedBatchId)
    ? selectedBatchId
    : (batches[0]?.id ?? '')
  const batch = batches.find(candidate => candidate.id === batchId)

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', batchId],
    queryFn: () => service.getAssignments(batchId),
    enabled: Boolean(batchId),
  })

  const tabs: { id: TabId; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'active',   label: 'Active' },
    { id: 'draft',    label: 'Drafts' },
    { id: 'closed',   label: 'Closed' },
  ]

  const filtered = assignments.filter(a => assignmentTab(a) === tab)

  if (batchesLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  }

  if (batchesError) {
    return (
      <Card className="max-w-xl"><CardContent className="py-8 text-center space-y-3">
        <p className="text-sm text-text-secondary">Your assigned batches could not be loaded.</p>
        <button type="button" onClick={() => void refetchBatches()} className="h-8 px-3 rounded border border-border text-sm text-text-secondary hover:text-text-primary">Retry</button>
      </CardContent></Card>
    )
  }

  if (!batch) {
    return (
      <Card className="max-w-xl"><CardContent className="py-8 text-center">
        <p className="text-sm text-text-secondary">No academic batch is assigned to your faculty account.</p>
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-4 max-w-[960px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Assignments</h1>
          <p className="text-sm text-text-muted mt-1">Manage and review assignments for your batches.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={batchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="appearance-none h-8 px-3 pr-7 bg-canvas border border-border rounded-[var(--radius-control)] text-sm text-text-primary focus:outline-none focus:border-primary/60"
            >
              {batches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
          <Link
            to="/assignments/new"
            className="flex items-center gap-1.5 h-8 px-3 bg-success-strong text-white text-sm font-medium rounded-[var(--radius-control)] border border-success-strong/80 hover:bg-success transition-colors"
          >
            <Plus size={14} /> New assignment
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
              tab === t.id
                ? 'text-text-primary border-primary font-medium'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            {t.label}
            {t.id !== 'draft' && (
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-primary/15 text-primary-bright' : 'bg-surface-raised text-text-muted'
              }`}>
                {assignments.filter(a => assignmentTab(a) === t.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">No {tab} assignments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.map(a => (
            <Link
              key={a.id}
              to={`/assignments/${a.id}`}
              className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-[var(--radius-panel)] hover:border-border-strong transition-colors group"
            >
              <div className="size-9 rounded-[var(--radius-control)] bg-surface-raised flex items-center justify-center shrink-0 border border-border">
                <ClipboardList size={15} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-text-muted capitalize">{a.mode}</span>
                  <span className="text-text-disabled">·</span>
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(a.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DeadlinePill deadline={a.deadline} state={a.state} />
                <Badge variant={a.state === 'published' ? 'success' : a.state === 'draft' ? 'default' : 'secondary'}>
                  {a.state}
                </Badge>
              </div>
              <ChevronRight size={15} className="text-text-muted group-hover:text-text-secondary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
