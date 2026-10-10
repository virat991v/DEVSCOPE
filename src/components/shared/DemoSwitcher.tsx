/**
 * Demo persona switcher — visible only in demo mode.
 * Allows switching between faculty, student, and admin views.
 */
import { Users, GraduationCap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoPersona } from '@/lib/demo-data'

interface DemoSwitcherProps {
  current: DemoPersona
  onChange: (p: DemoPersona) => void
}

const OPTIONS: { id: DemoPersona; label: string; icon: React.ElementType }[] = [
  { id: 'faculty',  label: 'Faculty',  icon: Users },
  { id: 'student',  label: 'Student',  icon: GraduationCap },
  { id: 'admin',    label: 'Admin',    icon: Shield },
]

export function DemoSwitcher({ current, onChange }: DemoSwitcherProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-surface border border-border-strong rounded-full px-2 py-1.5 shadow-lg">
        <span className="text-[11px] text-text-muted font-semibold px-2 mr-1 uppercase tracking-wide border-r border-border pr-3">Demo</span>
        {OPTIONS.map(opt => {
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                current === opt.id
                  // Active: teal
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-surface-raised hover:text-text-primary',
              )}
              aria-pressed={current === opt.id}
            >
              <Icon size={12} />
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
