import { cn } from '@/lib/utils'

type Status = 'planning' | 'ongoing' | 'completed' | 'archived'

const STATUS_LABEL: Record<Status, string> = {
  planning: 'Planning',
  ongoing: 'Ongoing',
  completed: 'Completed',
  archived: 'Archived',
}

const STATUS_CLASSES: Record<Status, string> = {
  planning:
    'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
  ongoing:
    'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
  completed: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground opacity-70',
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
