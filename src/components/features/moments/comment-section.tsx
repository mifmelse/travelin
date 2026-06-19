'use client'

import { useActionState, useState } from 'react'
import { MessageCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PostCommentView } from '@/services/post.service'
import {
  addCommentAction,
  deleteCommentAction,
  type ActionState,
} from '@/app/(app)/trips/[id]/moments/actions'

function CommentRow({
  tripId,
  comment,
  currentUserId,
  isOwner,
  onReply,
}: {
  tripId: string
  comment: PostCommentView
  currentUserId: string
  isOwner: boolean
  onReply?: (id: string) => void
}) {
  const canDelete = comment.author_id === currentUserId || isOwner
  return (
    <div className="flex gap-2 py-1.5">
      <div className="flex-1">
        <div className="rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="font-medium">{comment.author_name}</span>
          <p className="whitespace-pre-wrap">{comment.body}</p>
        </div>
        <div className="mt-1 flex gap-3 pl-1 text-xs text-muted-foreground">
          {onReply && <button onClick={() => onReply(comment.id)}>Balas</button>}
          {canDelete && (
            <button
              onClick={() => deleteCommentAction(tripId, comment.id)}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommentSection({
  tripId,
  postId,
  comments,
  currentUserId,
  isOwner,
  canComment,
}: {
  tripId: string
  postId: string
  comments: PostCommentView[]
  currentUserId: string
  isOwner: boolean
  canComment: boolean
}) {
  const [open, setOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addCommentAction.bind(null, tripId, postId),
    {}
  )

  const topLevel = comments.filter((c) => !c.parent_comment_id)
  const repliesOf = (id: string) => comments.filter((c) => c.parent_comment_id === id)

  return (
    <div className="border-t border-border px-4 py-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <MessageCircle className="h-4 w-4" />
        {comments.length > 0 ? `Lihat ${comments.length} komentar` : 'Komentar'}
      </button>

      {open && (
        <div className="mt-2">
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentRow
                tripId={tripId}
                comment={c}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onReply={canComment ? setReplyTo : undefined}
              />
              <div className="ml-6">
                {repliesOf(c.id).map((r) => (
                  <CommentRow
                    key={r.id}
                    tripId={tripId}
                    comment={r}
                    currentUserId={currentUserId}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            </div>
          ))}

          {canComment && (
            <form
              action={(fd) => {
                formAction(fd)
                setReplyTo(null)
              }}
              className="mt-2 flex gap-2"
            >
              {replyTo && <input type="hidden" name="parent_comment_id" value={replyTo} />}
              <Input
                name="body"
                placeholder={replyTo ? 'Tulis balasan…' : 'Tulis komentar…'}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={pending}>
                Kirim
              </Button>
            </form>
          )}
          {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
        </div>
      )}
    </div>
  )
}
