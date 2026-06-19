import { MapPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/services/profile.service'
import { listTripsForUser } from '@/services/trip.service'
import { TripCard } from '@/components/features/trip/trip-card'
import { NewTripDialog } from '@/components/features/trip/new-trip-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [profile, trips] = await Promise.all([
    getCurrentProfile(supabase),
    listTripsForUser(supabase, user.id),
  ])

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Halo, ${profile?.display_name ?? 'Traveler'} 👋`}
        description={
          trips.length === 0
            ? 'Yuk, bikin trip pertama lo.'
            : `Lo punya ${trips.length} trip.`
        }
        action={<NewTripDialog />}
      />

      {trips.length === 0 ? (
        <EmptyState
          icon={MapPlus}
          title="Belum ada trip"
          description="Klik tombol 'Trip baru' di atas untuk mulai planning trip pertama lo."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
