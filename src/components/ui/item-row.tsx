import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { IconTile, type IconTone } from './icon-tile'

type ItemRowProps = {
  icon: LucideIcon
  iconTone?: IconTone
  time?: string
  duration?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  href?: string
  className?: string
}

export function ItemRow({
  icon,
  iconTone = 'primary',
  time,
  duration,
  title,
  subtitle,
  actions,
  href,
  className,
}: ItemRowProps) {
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors',
        href && 'hover:bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))]',
        className
      )}
    >
      <IconTile icon={icon} tone={iconTone} />
      <div className="min-w-0 flex-1">
        {time || duration ? (
          <div className="mb-0.5 flex items-baseline gap-2">
            {time ? (
              <span className="text-xs font-medium text-muted-foreground">
                {time}
              </span>
            ) : null}
            {duration ? (
              <span className="text-xs text-muted-foreground">
                · {duration}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }
  return content
}
