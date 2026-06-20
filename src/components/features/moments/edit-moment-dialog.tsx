'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PostView } from '@/services/post.service'
import { updatePostAction, type ActionState } from '@/app/(app)/trips/[id]/moments/actions'

export function EditMomentDialog({
  tripId,
  post,
  open,
  onOpenChange,
}: {
  tripId: string
  post: PostView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Momen</DialogTitle>
          <DialogDescription>Ubah caption atau lokasi momen ini.</DialogDescription>
        </DialogHeader>
        {open && (
          <EditMomentForm tripId={tripId} post={post} onSuccess={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditMomentForm({
  tripId,
  post,
  onSuccess,
}: {
  tripId: string
  post: PostView
  onSuccess: () => void
}) {
  const [body, setBody] = useState(post.body ?? '')
  const [location, setLocation] = useState(post.location_name ?? '')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePostAction.bind(null, tripId, post.id),
    {}
  )

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="edit-body">Caption</Label>
        <textarea
          id="edit-body"
          name="body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        {state.fieldErrors?.body && (
          <p className="text-xs text-destructive">{state.fieldErrors.body[0]}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-location">Lokasi (opsional)</Label>
        <Input
          id="edit-location"
          name="location_name"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  )
}
