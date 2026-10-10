import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  raised?: boolean
}

// GitHub repository panel style: #161B22 bg, 1px #30363D border, 6px radius
export function Card({ children, className, raised }: CardProps) {
  return (
    <div className={cn(
      'rounded-[var(--radius-panel)] border border-border',
      raised ? 'bg-surface-raised' : 'bg-surface',
      className,
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3 border-b border-border', className)}>{children}</div>
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-4 py-4', className)}>{children}</div>
}
