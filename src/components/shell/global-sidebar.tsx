'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './user-menu'
import { NAV_ITEMS, isNavActive } from './nav-items'
import { cn } from '@/lib/utils'

type GlobalSidebarProps = {
  displayName: string | null
  email: string | null
}

export function GlobalSidebar({ displayName, email }: GlobalSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex h-screen w-16 shrink-0 flex-col items-center border-r border-border bg-card py-4 sticky top-0">
      <Link
        href="/dashboard"
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground"
        aria-label="travelin home"
      >
        t
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isNavActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                active
                  ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
            </Link>
          )
        })}
      </nav>

      <UserMenu displayName={displayName} email={email} variant="icon" />
    </aside>
  )
}
