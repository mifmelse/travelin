import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/services/profile.service'
import { AppShell } from '@/components/shell/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await ensureProfile(supabase, user)

  return (
    <AppShell
      displayName={profile.display_name}
      email={user.email ?? null}
    >
      {children}
    </AppShell>
  )
}
