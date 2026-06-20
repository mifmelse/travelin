'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleReactionAction } from '@/app/(app)/trips/[id]/moments/actions'

export function LikeButton({
  tripId,
  postId,
  initialLiked,
  initialCount,
  canReact,
}: {
  tripId: string
  postId: string
  initialLiked: boolean
  initialCount: number
  canReact: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!canReact) return
    const next = !liked
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    startTransition(async () => {
      const res = await toggleReactionAction(tripId, postId)
      if (res.error) {
        setLiked(!next)
        setCount((c) => c + (next ? -1 : 1))
      }
    })
  }

  return (
    <button
      onClick={onClick}
      disabled={!canReact || pending}
      className={cn('flex items-center gap-1.5 text-sm', liked ? 'text-red-500' : 'text-muted-foreground')}
    >
      <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
      {count > 0 ? `${count} suka` : 'Suka'}
    </button>
  )
}
