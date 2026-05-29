'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ITINERARY_TYPES, type ItineraryType } from './itinerary-meta'
import { updateItineraryItemAction } from '@/app/(app)/trips/[id]/itinerary/actions'

export type ItineraryItem = {
  id: string
  trip_id: string
  type: ItineraryType
  title: string
  start_at: string | null
  end_at: string | null
  location_name: string | null
  notes: string | null
}

// Convert a stored timestamptz string to a value for <input type="datetime-local">.
function toDatetimeLocal(value: string | null): string {
  return value ? value.slice(0, 16) : ''
}

type EditItineraryDialogProps = {
  item: ItineraryItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditItineraryDialog({
  item,
  open,
  onOpenChange,
}: EditItineraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>Update detail item itinerary</DialogDescription>
        </DialogHeader>

        {/* Key forces remount each time dialog opens, so form state resets */}
        {open && (
          <EditItineraryForm
            key={`${item.id}-${open}`}
            item={item}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditItineraryForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: ItineraryItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(
    updateItineraryItemAction.bind(null, item.trip_id, item.id),
    {}
  )

  const [type, setType] = useState<ItineraryType>(item.type)
  const [title, setTitle] = useState(item.title)
  const [startAt, setStartAt] = useState(toDatetimeLocal(item.start_at))
  const [endAt, setEndAt] = useState(toDatetimeLocal(item.end_at))
  const [locationName, setLocationName] = useState(item.location_name ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

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
          value={type}
          onChange={(e) => setType(e.target.value as ItineraryType)}
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
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
          <Input
            id="start_at"
            name="start_at"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Selesai</Label>
          <Input
            id="end_at"
            name="end_at"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>
      </div>
      {state.fieldErrors?.end_at && (
        <p className="text-sm text-destructive">
          {state.fieldErrors.end_at[0]}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="location_name">Lokasi</Label>
        <Input
          id="location_name"
          name="location_name"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
