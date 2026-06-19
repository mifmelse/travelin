import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconTone = 'primary' | 'accent' | 'muted'

const TILE_BG: Record<IconTone, string> = {
  primary:
    'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] dark:bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]',
  accent:
    'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] dark:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]',
  muted: 'bg-muted',
}

const TILE_FG: Record<IconTone, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  muted: 'text-muted-foreground',
}

const TILE_SIZE = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

const ICON_SIZE = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  className,
}: {
  icon: LucideIcon
  tone?: IconTone
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg shrink-0',
        TILE_SIZE[size],
        TILE_BG[tone],
        className
      )}
    >
      <Icon className={cn(ICON_SIZE[size], TILE_FG[tone])} />
    </div>
  )
}
