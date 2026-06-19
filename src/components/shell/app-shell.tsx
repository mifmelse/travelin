import { GlobalSidebar } from './global-sidebar'
import { TopBar } from './top-bar'

type AppShellProps = {
  displayName: string | null
  email: string | null
  children: React.ReactNode
}

export function AppShell({ displayName, email, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <GlobalSidebar displayName={displayName} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar displayName={displayName} email={email} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  )
}
