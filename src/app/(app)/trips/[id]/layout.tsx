import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@/services/trip.service'
import { TripProvider } from '@/components/features/trip/trip-context'
import { TripShell } from '@/components/shell/trip-shell'

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const trip = await getTripById(supabase, id, user.id)
  if (!trip) notFound()

  return (
    <TripProvider trip={trip}>
      <TripShell tripId={trip.id} tripTitle={trip.title}>
        {children}
      </TripShell>
    </TripProvider>
  )
}
