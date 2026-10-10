import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'secondary' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

// Compact badges — dark tinted bg, colored text, thin border
const variants: Record<BadgeVariant, string> = {
  default:   'bg-surface-raised text-text-secondary border border-border',
  success:   'bg-success/10 text-success-bright border border-success/20',
  warning:   'bg-warning/10 text-warning border border-warning/25',
  danger:    'bg-danger/10 text-danger border border-danger/25',
  secondary: 'bg-primary/10 text-primary-bright border border-primary/20',
  info:      'bg-primary/10 text-primary-bright border border-primary/20',
}

export function Badge({ variant = 'default', size = 'md', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}
