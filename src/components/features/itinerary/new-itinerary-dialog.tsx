'use client'

import { useState, useActionState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ITINERARY_TYPES } from './itinerary-meta'
import {
  createItineraryItemAction,
  type ActionState,
} from '@/app/(app)/trips/[id]/itinerary/actions'

export function NewItineraryDialog({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        Tambah item
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tambah item itinerary</DialogTitle>
          <DialogDescription>
            Catat aktivitas, penerbangan, atau apapun di trip lo.
          </DialogDescription>
        </DialogHeader>
        {/* key remounts the form so fields reset each time dialog opens */}
        {open && (
          <NewItineraryForm
            key={tripId}
            tripId={tripId}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewItineraryForm({
  tripId,
  onSuccess,
  onCancel,
}: {
  tripId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createItineraryItemAction.bind(null, tripId),
    {}
  )

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">Tipe *</Label>
        <select
          id="type"
          name="type"
          defaultValue="activity"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {ITINERARY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Judul *</Label>
        <Input
          id="title"
          name="title"
          placeholder="Check-in hotel, makan di Warung X..."
          required
          autoFocus
        />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.title[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_at">Mulai</Label>
          <Input id="start_at" name="start_at" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Selesai</Label>
          <Input id="end_at" name="end_at" type="datetime-local" />
          {state.fieldErrors?.end_at && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.end_at[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location_name">Lokasi</Label>
        <Input
          id="location_name"
          name="location_name"
          placeholder="Ubud, Bali"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Bawa paspor, konfirmasi jam 2 siang..."
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Tambah'}
        </Button>
      </DialogFooter>
    </form>
  )
}
