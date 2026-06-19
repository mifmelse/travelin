import { MapPin } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import type { PostView } from '@/services/post.service'
import { MediaGallery } from './media-gallery'
import { LikeButton } from './like-button'
import { CommentSection } from './comment-section'
import { MomentActionsMenu } from './moment-actions-menu'

export function MomentCard({
  tripId,
  post,
  currentUserId,
  canEditPost,
  isTripOwner,
  canInteract,
}: {
  tripId: string
  post: PostView
  currentUserId: string
  canEditPost: boolean
  isTripOwner: boolean
  canInteract: boolean
}) {
  const timeAgo = formatDistanceToNow(parseISO(post.created_at), {
    addSuffix: true,
    locale: idLocale,
  })

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        {post.author_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.author_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm">
            {post.author_name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">
            {timeAgo}
            {post.location_name && (
              <>
                {' · '}
                <span className="inline-flex items-center gap-0.5 text-sky-600">
                  <MapPin className="h-3 w-3" />
                  {post.location_name}
                </span>
              </>
            )}
          </p>
        </div>
        {canEditPost && <MomentActionsMenu tripId={tripId} post={post} />}
      </header>

      {post.body && <p className="whitespace-pre-wrap px-4 pb-3 text-sm">{post.body}</p>}

      <MediaGallery media={post.media} />

      <div className="flex gap-5 px-4 py-3">
        <LikeButton
          tripId={tripId}
          postId={post.id}
          initialLiked={post.liked_by_me}
          initialCount={post.like_count}
          canReact={canInteract}
        />
      </div>

      <CommentSection
        tripId={tripId}
        postId={post.id}
        comments={post.comments}
        currentUserId={currentUserId}
        isOwner={isTripOwner}
        canComment={canInteract}
      />
    </article>
  )
}
