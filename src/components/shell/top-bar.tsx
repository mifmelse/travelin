import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'

type TopBarProps = {
  displayName: string | null
  email: string | null
}

export function TopBar({ displayName, email }: TopBarProps) {
  return (
    <div className="px-4 pt-4 md:px-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <MobileNav />
        </div>
        <UserMenu displayName={displayName} email={email} variant="compact" />
      </div>
    </div>
  )
}
