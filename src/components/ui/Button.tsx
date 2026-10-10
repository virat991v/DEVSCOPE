import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'blue'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  // Teal primary action
  primary:   'bg-primary text-white border border-primary/80 hover:bg-primary-hover hover:border-primary-hover/80',
  // Secondary — elevated surface
  secondary: 'bg-surface-raised text-text-primary border border-border hover:bg-surface-hover hover:border-border-strong',
  // Ghost — no background
  ghost:     'bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary border border-transparent',
  // Danger action
  danger:    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
  // Neutral outline
  outline:   'border border-border text-text-secondary hover:border-border-strong hover:text-text-primary bg-transparent',
  // Cyan bright accent — for important highlighted actions
  blue:      'bg-primary text-white border border-primary-bright/30 hover:bg-primary-hover ring-1 ring-primary-bright/20',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs gap-1.5',
  md: 'h-8 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-[var(--radius-control)] transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
        )}
        {children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
