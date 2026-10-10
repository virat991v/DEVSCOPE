import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

interface AvatarProps {
  initials: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-11 text-base' }

export function Avatar({ initials, className, size = 'md' }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        // GitHub-style: dark elevated surface with blue-tinted text
        'inline-flex items-center justify-center rounded-full bg-surface-raised border border-border text-primary-bright font-semibold select-none shrink-0',
        sizeMap[size],
        className,
      )}
    >
      <AvatarPrimitive.Fallback delayMs={0} className="flex items-center justify-center w-full h-full">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
