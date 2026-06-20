import { Images } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listPostsForTrip } from '@/services/post.service'
import { getTripById, getTripMembership } from '@/services/trip.service'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { NewMomentDialog } from '@/components/features/moments/new-moment-dialog'
import { MomentFeed } from '@/components/features/moments/moment-feed'

export default async function TripMomentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [trip, posts, membership] = await Promise.all([
    getTripById(supabase, id, user.id),
    listPostsForTrip(supabase, id, user.id),
    getTripMembership(supabase, id, user.id),
  ])

  const role = membership?.role ?? 'viewer'
  const canInteract = role === 'owner' || role === 'editor'
  const isTripOwner = trip?.owner_id === user.id

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Moments"
        action={canInteract ? <NewMomentDialog tripId={id} /> : undefined}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Belum ada momen"
          description="Bagikan foto, video, dan cerita perjalananmu di sini."
        />
      ) : (
        <MomentFeed
          tripId={id}
          posts={posts}
          currentUserId={user.id}
          isTripOwner={isTripOwner}
          canInteract={canInteract}
        />
      )}
    </div>
  )
}
