/**
 * Academic Activity Explorer — contribution heatmap.
 * Keyboard accessible; day detail in a side panel.
 * Uses only approved academic repository data.
 * Colors: GitHub contribution green palette.
 */
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { DailyActivity } from '@/types'
import { Tooltip } from '@/components/ui/Tooltip'

interface HeatmapProps {
  data: DailyActivity[]
  timezone?: string
}

// GitHub contribution green palette — inline styles for precise control
const HEAT_COLORS = {
  empty:   { bg: '#161B22', border: '#21262D' },
  level1:  { bg: '#0E4429', border: '#0E4429' },
  level2:  { bg: '#006D32', border: '#006D32' },
  level3:  { bg: '#26A641', border: '#26A641' },
  level4:  { bg: '#39D353', border: '#39D353' },
  stale:   { bg: '#D2992210', border: '#D29922' },
  outside: { bg: '#0D1117',  border: '#21262D' },
}

function getDayStyle(day: DailyActivity): React.CSSProperties {
  if (!day.date) return { background: 'transparent' }
  if (day.coverageState === 'unavailable')     return { backgroundColor: HEAT_COLORS.outside.bg, borderColor: HEAT_COLORS.outside.border, opacity: 0.4 }
  if (day.coverageState === 'pending_import')  return { backgroundColor: HEAT_COLORS.outside.bg, borderColor: HEAT_COLORS.outside.border, opacity: 0.6 }
  if (day.coverageState === 'stale')           return { backgroundColor: '#D2992215', borderColor: '#D2992250' }
  const c = day.commitCount
  if (c === 0)  return { backgroundColor: HEAT_COLORS.empty.bg,  borderColor: HEAT_COLORS.empty.border }
  if (c <= 2)   return { backgroundColor: HEAT_COLORS.level1.bg, borderColor: HEAT_COLORS.level1.border }
  if (c <= 4)   return { backgroundColor: HEAT_COLORS.level2.bg, borderColor: HEAT_COLORS.level2.border }
  if (c <= 7)   return { backgroundColor: HEAT_COLORS.level3.bg, borderColor: HEAT_COLORS.level3.border }
  return        { backgroundColor: HEAT_COLORS.level4.bg, borderColor: HEAT_COLORS.level4.border }
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['','Mon','','Wed','','Fri','']

function groupByWeek(days: DailyActivity[]): DailyActivity[][] {
  const weeks: DailyActivity[][] = []
  let week: DailyActivity[] = []
  if (days.length === 0) return weeks
  const firstDay = new Date(days[0].date + 'T00:00:00Z').getUTCDay()
  for (let i = 0; i < firstDay; i++) week.push({ date: '', commitCount: 0, prCount: 0, issueCount: 0, qualifiesForStreak: false, coverageState: 'unavailable', repositoryIds: [] })
  for (const day of days) {
    week.push(day)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: '', commitCount: 0, prCount: 0, issueCount: 0, qualifiesForStreak: false, coverageState: 'unavailable', repositoryIds: [] })
    weeks.push(week)
  }
  return weeks
}

interface DayDetail { day: DailyActivity }

function DayDetailPanel({ day, onClose }: DayDetail & { onClose: () => void }) {
  if (!day.date) return null
  const d = new Date(day.date + 'T00:00:00Z')
  const formatted = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <aside className="bg-surface border border-border rounded-[var(--radius-panel)] p-4 min-w-[260px] max-w-[300px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-text-primary">{formatted}</p>
          <p className="text-xs text-text-muted mt-0.5">
            Coverage:{' '}
            <span className={cn(
              day.coverageState === 'healthy'  ? 'text-success' :
              day.coverageState === 'stale'    ? 'text-warning' : 'text-text-muted',
            )}>
              {day.coverageState.replace('_', ' ')}
            </span>
          </p>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs leading-none">✕</button>
      </div>

      {day.coverageState === 'unavailable' || day.coverageState === 'pending_import' ? (
        <p className="text-xs text-text-muted">
          {day.coverageState === 'pending_import'
            ? 'This date is outside the imported history window.'
            : 'Data unavailable for this date.'}
        </p>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Commits</dt>
            <dd className="text-text-primary tabular-nums font-medium">{day.commitCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Pull requests</dt>
            <dd className="text-text-primary tabular-nums">{day.prCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Issues</dt>
            <dd className="text-text-primary tabular-nums">{day.issueCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Qualifies streak</dt>
            <dd className={day.qualifiesForStreak ? 'text-success' : 'text-text-muted'}>
              {day.qualifiesForStreak ? 'Yes' : 'No'}
            </dd>
          </div>
          {day.repositoryIds.length > 0 && (
            <div>
              <dt className="text-text-muted mb-1">Repositories</dt>
              {day.repositoryIds.map(r => (
                <dd key={r} className="text-xs font-mono text-primary-bright truncate">{r}</dd>
              ))}
            </div>
          )}
        </dl>
      )}
    </aside>
  )
}

export function ActivityHeatmap({ data, timezone = 'Asia/Kolkata' }: HeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DailyActivity | null>(null)
  const weeks = useMemo(() => groupByWeek(data), [data])

  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const firstDate = week.find(d => d.date)
    if (firstDate) {
      const m = new Date(firstDate.date + 'T00:00:00Z').getUTCMonth()
      if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: wi }); lastMonth = m }
    }
  })

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pt-5">
          {DAYS.map((d, i) => (
            <div key={i} className="h-3 text-[10px] text-text-muted w-6 text-right leading-3">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: '2px' }}>
            {monthLabels.map((ml, i) => (
              <span
                key={i}
                className="text-[10px] text-text-muted"
                style={{ position: 'relative', marginLeft: i === 0 ? `${ml.col * 14}px` : `${(ml.col - (monthLabels[i-1]?.col ?? 0)) * 14 - 20}px` }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => {
                  if (!day.date) return <div key={di} className="size-3" />
                  const label = `${day.date}: ${day.commitCount} commit${day.commitCount !== 1 ? 's' : ''}, coverage ${day.coverageState}`
                  const style = getDayStyle(day)
                  const isSelected = selectedDay?.date === day.date
                  return (
                    <Tooltip key={di} content={label} side="top">
                      <button
                        className={cn(
                          'size-3 rounded-sm transition-all border',
                          isSelected && 'outline outline-1 outline-primary-bright outline-offset-1',
                        )}
                        style={{
                          ...style,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                        onClick={() => setSelectedDay(prev => prev?.date === day.date ? null : day)}
                        aria-label={label}
                        aria-pressed={isSelected}
                      />
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <DayDetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} />
        )}
      </div>

      {/* Legend — GitHub-native green squares */}
      <div className="flex items-center gap-2 text-[10px] text-text-muted flex-wrap">
        <span>Less</span>
        {[HEAT_COLORS.empty, HEAT_COLORS.level1, HEAT_COLORS.level2, HEAT_COLORS.level3, HEAT_COLORS.level4].map((c, i) => (
          <div
            key={i}
            className="size-3 rounded-sm border"
            style={{ backgroundColor: c.bg, borderColor: c.border, borderWidth: '1px', borderStyle: 'solid' }}
            aria-hidden
          />
        ))}
        <span>More</span>
        <span className="ml-3 border-l border-border pl-3">Timezone: {timezone}</span>
        <span className="ml-2" style={{ color: '#D29922' }}>■ Stale</span>
        <span className="ml-1 opacity-50">■ Outside scope</span>
      </div>

      {/* Screen-reader accessible list */}
      <details className="mt-2">
        <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
          Show accessible activity list
        </summary>
        <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-48 overflow-y-auto text-xs text-text-muted">
          {data.filter(d => d.commitCount > 0 || d.prCount > 0).map(d => (
            <li key={d.date}>
              {d.date}: {d.commitCount}c {d.prCount}pr {d.issueCount}i
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
