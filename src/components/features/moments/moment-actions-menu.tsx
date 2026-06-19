'use client'

import { useState } from 'react'
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
            onClick={() => deletePostAction(tripId, post.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditMomentDialog tripId={tripId} post={post} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
