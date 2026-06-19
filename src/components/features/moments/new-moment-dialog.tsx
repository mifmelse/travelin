'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ACCEPTED_MEDIA, MEDIA_HINT } from './media-meta'
import { captureVideoPoster } from './capture-poster'
import { createPostAction, type ActionState } from '@/app/(app)/trips/[id]/moments/actions'

export function NewMomentDialog({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        Buat Momen
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Buat Momen</DialogTitle>
          <DialogDescription>Bagikan foto, video, atau cerita perjalananmu.</DialogDescription>
        </DialogHeader>
        {open && <MomentForm tripId={tripId} onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function MomentForm({ tripId, onSuccess }: { tripId: string; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPostAction.bind(null, tripId),
    {}
  )
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state.success, onSuccess])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.delete('media')
    for (let i = 0; i < files.length; i++) {
      fd.append('media', files[i])
      if (files[i].type.startsWith('video/')) {
        const poster = await captureVideoPoster(files[i])
        if (poster) fd.append(`thumb_${i}`, poster)
      }
    }
    formAction(fd)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="body">Caption</Label>
        <textarea
          id="body"
          name="body"
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          placeholder="Ceritakan momen ini…"
        />
        {state.fieldErrors?.body && (
          <p className="text-xs text-destructive">{state.fieldErrors.body[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location_name">Lokasi (opsional)</Label>
        <Input id="location_name" name="location_name" placeholder="cth. Canggu, Bali" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="media">Foto / Video</Label>
        <input
          id="media"
          type="file"
          accept={ACCEPTED_MEDIA}
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm"
        />
        <p className="text-xs text-muted-foreground">{MEDIA_HINT}</p>
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">{files.length} file dipilih</p>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Mengunggah…' : 'Posting'}
        </Button>
      </DialogFooter>
    </form>
  )
}
