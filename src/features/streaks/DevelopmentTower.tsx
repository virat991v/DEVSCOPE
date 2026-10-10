/**
 * Development Tower — SVG/CSS architectural progression diagram.
 * Labeled floors, completed/current/locked states.
 * Consistency-oriented labels, NOT expertise claims.
 * Has textual equivalent for accessibility.
 * Colors: GitHub green for complete, blue for current/active, muted for locked.
 */
import { cn } from '@/lib/utils'
import type { Streak } from '@/types'

interface TowerFloor {
  threshold: number
  label: string
  sublabel: string
}

const FLOORS: TowerFloor[] = [
  { threshold: 5,   label: 'Getting Started',       sublabel: '5 qualifying days' },
  { threshold: 10,  label: 'Building Rhythm',        sublabel: '10 qualifying days' },
  { threshold: 25,  label: 'Consistent Practice',    sublabel: '25 qualifying days' },
  { threshold: 50,  label: 'Consistent Practice II', sublabel: '50 qualifying days' },
  { threshold: 100, label: 'Sustained Practice',     sublabel: '100 qualifying days' },
  { threshold: 150, label: 'Sustained Practice II',  sublabel: '150 qualifying days' },
  { threshold: 200, label: 'Long-Term Commitment',   sublabel: '200 qualifying days' },
]

interface TowerProps {
  streak: Streak
  compact?: boolean
}

function FloorStatus({ floor, longest, current }: { floor: TowerFloor; longest: number; current: number }) {
  if (longest >= floor.threshold) return 'complete'
  if (current > 0 && current >= floor.threshold - 5 && current < floor.threshold) return 'current'
  if (longest >= floor.threshold - 5) return 'approaching'
  return 'locked'
}

export function DevelopmentTower({ streak, compact = false }: TowerProps) {
  const floorsReversed = [...FLOORS].reverse()
  const currentFloorIdx = FLOORS.filter(f => streak.longest >= f.threshold).length - 1
  const nextFloor = FLOORS[currentFloorIdx + 1]
  const progressToNext = nextFloor
    ? Math.min(100, Math.round((streak.longest / nextFloor.threshold) * 100))
    : 100

  return (
    <div className={cn('flex gap-4', compact ? 'flex-row items-end' : 'flex-col')}>
      {/* Tower floors */}
      <div
        className="flex flex-col gap-0.5"
        role="img"
        aria-label={`Development tower. Longest streak: ${streak.longest} days. Current streak: ${streak.current} days.`}
      >
        {floorsReversed.map((floor, i) => {
          const status = FloorStatus({ floor, longest: streak.longest, current: streak.current })
          return (
            <div
              key={floor.threshold}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-[4px] transition-colors border',
                compact ? 'min-w-[180px]' : 'min-w-[220px]',
                // GitHub green for complete floors
                status === 'complete'    && 'bg-success/10 border-success/25',
                // Blue for current/active floor
                status === 'current'     && 'bg-primary/8 border-primary/30',
                // Amber tint for approaching
                status === 'approaching' && 'bg-warning/5 border-warning/15',
                // Canvas-subtle for locked — recessed
                status === 'locked'      && 'bg-canvas-subtle border-border/40 opacity-50',
              )}
            >
              {/* Floor indicator square */}
              <div className={cn(
                'size-4 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0',
                status === 'complete'    && 'bg-success-strong text-white',
                status === 'current'     && 'bg-primary text-white animate-pulse',
                status === 'approaching' && 'bg-warning/20 text-warning border border-warning/30',
                status === 'locked'      && 'bg-surface-raised text-text-disabled border border-border',
              )}>
                {FLOORS.length - i}
              </div>

              {!compact && (
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium leading-tight',
                    status === 'complete'    ? 'text-success' :
                    status === 'current'     ? 'text-primary-bright' :
                    status === 'approaching' ? 'text-warning' :
                    'text-text-disabled',
                  )}>
                    {floor.label}
                  </p>
                  <p className="text-[10px] text-text-muted leading-tight">{floor.sublabel}</p>
                </div>
              )}

              {status === 'complete' && (
                <span className="ml-auto text-[10px] text-success" aria-hidden>✓</span>
              )}
              {status === 'current' && (
                <span className="ml-auto text-[10px] text-primary-bright" aria-hidden>→</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Stats */}
      {!compact && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-canvas-subtle rounded-[var(--radius-control)] p-3 border border-border">
              <p className="text-xs text-text-muted">Current streak</p>
              <p className="text-2xl font-semibold tabular-nums text-text-primary mt-0.5">{streak.current}</p>
              <p className="text-[11px] text-text-muted">qualifying days</p>
            </div>
            <div className="bg-canvas-subtle rounded-[var(--radius-control)] p-3 border border-border">
              <p className="text-xs text-text-muted">Longest streak</p>
              <p className="text-2xl font-semibold tabular-nums text-text-primary mt-0.5">{streak.longest}</p>
              <p className="text-[11px] text-text-muted">qualifying days</p>
            </div>
          </div>

          {nextFloor && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Progress to {nextFloor.label}</span>
                <span className="text-text-secondary tabular-nums">{streak.longest}/{nextFloor.threshold}</span>
              </div>
              <div
                className="h-1.5 bg-canvas-subtle rounded-full overflow-hidden border border-border"
                role="progressbar"
                aria-valuenow={progressToNext}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress to ${nextFloor.label}`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%`, backgroundColor: '#3FB950' }}
                />
              </div>
            </div>
          )}

          {streak.lastQualifyingDate && (
            <p className="text-xs text-text-muted">
              Last qualifying day:{' '}
              <span className="text-text-secondary">
                {new Date(streak.lastQualifyingDate + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
