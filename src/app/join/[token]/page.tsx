import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/services/profile.service'
import { getTripMembership } from '@/services/trip.service'
import { getInvitePreview } from '@/services/member.service'
import { formatTripDateRange } from '@/lib/format'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { JoinTripButton } from './join-trip-button'

const ROLE_LABEL: Record<string, string> = {
  editor: 'Editor (bisa ngedit isi trip)',
  viewer: 'Viewer (cuma bisa lihat)',
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  )
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proxy normally redirects unauthenticated users; guard defensively.
  if (!user) redirect(`/login?redirect_to=/join/${token}`)
  await ensureProfile(supabase, user)

  const invite = await getInvitePreview(supabase, token)

  if (!invite) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Link tidak valid</CardTitle>
          <CardDescription>
            Link undangan ini tidak valid atau sudah dinonaktifkan oleh owner.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Ke dashboard
          </Link>
        </CardFooter>
      </Shell>
    )
  }

  const trip = invite.trip
  const existing = await getTripMembership(supabase, invite.tripId, user.id)

  if (existing) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Kamu sudah anggota</CardTitle>
          <CardDescription>
            Kamu sudah jadi anggota trip &quot;{trip.title}&quot;.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={`/trips/${invite.tripId}`} className={buttonVariants()}>
            Buka trip
          </Link>
        </CardFooter>
      </Shell>
    )
  }

  return (
    <Shell>
      <CardHeader>
        <CardTitle>Kamu diundang ke trip</CardTitle>
        <CardDescription>{ROLE_LABEL[invite.role] ?? invite.role}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-lg font-semibold text-foreground">{trip.title}</p>
        {trip.destination && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {trip.destination}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {formatTripDateRange(trip.start_date, trip.end_date)}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          Nanti aja
        </Link>
        <JoinTripButton token={token} />
      </CardFooter>
    </Shell>
  )
}
