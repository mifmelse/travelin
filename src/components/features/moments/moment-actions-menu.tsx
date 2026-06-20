'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { EditMomentDialog } from './edit-moment-dialog'
import { deletePostAction } from '@/app/(app)/trips/[id]/moments/actions'
import type { PostView } from '@/services/post.service'

export function MomentActionsMenu({ tripId, post }: { tripId: string; post: PostView }) {
  const [editOpen, setEditOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          aria-label="Aksi momen"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await deletePostAction(tripId, post.id)
                if (res.error) setError(res.error)
              })
            }
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="px-1 text-xs text-destructive">{error}</p>}
      <EditMomentDialog tripId={tripId} post={post} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
