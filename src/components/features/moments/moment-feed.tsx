import type { PostView } from '@/services/post.service'
import { MomentCard } from './moment-card'

export function MomentFeed({
  tripId,
  posts,
  currentUserId,
  isTripOwner,
  canInteract,
}: {
  tripId: string
  posts: PostView[]
  currentUserId: string
  isTripOwner: boolean
  canInteract: boolean
}) {
  return (
    <div className="space-y-4">
      {posts.map((post) => {
        // A user can edit/delete a post if they authored it or own the trip.
        const canEditPost = canInteract && (post.author_id === currentUserId || isTripOwner)
        return (
          <MomentCard
            key={post.id}
            tripId={tripId}
            post={post}
            currentUserId={currentUserId}
            canEditPost={canEditPost}
            isTripOwner={isTripOwner}
            canInteract={canInteract}
          />
        )
      })}
    </div>
  )
}
