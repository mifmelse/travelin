import { cn } from '@/lib/utils'

type Role = 'owner' | 'editor' | 'viewer'

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_CLASSES: Record<Role, string> = {
  owner: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
  editor: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
  viewer: 'bg-muted text-muted-foreground',
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        ROLE_CLASSES[role],
        className
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}
