/**
 * Batches page — list of academic batches with roster counts.
 * Faculty sees only assigned batches. Admin sees all.
 */
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Users, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { service } from '@/services'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'

export function BatchesPage() {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => service.getBatches(),
  })

  return (
    <div className="space-y-5 max-w-[960px]">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Batches</h1>
        <p className="text-sm text-text-muted mt-1">Academic batches you have access to.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">No batches assigned.</p>
            <p className="text-xs text-text-muted mt-1">Ask your admin to assign you to a batch.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {batches.map(batch => (
            <Link
              key={batch.id}
              to={`/batches/${batch.id}`}
              className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-[var(--radius-panel)] hover:border-border-strong transition-colors group"
            >
              <div className="size-9 rounded-[var(--radius-control)] bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-primary-bright" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{batch.label}</p>
                <p className="text-xs text-text-muted">{batch.year} · {batch.semester} · {batch.division}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Users size={13} />
                  <span className="tabular-nums">{batch.enrolledCount}</span>
                </div>
                <Badge variant="default">{batch.section}</Badge>
              </div>
              <ChevronRight size={15} className="text-text-muted group-hover:text-text-secondary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
