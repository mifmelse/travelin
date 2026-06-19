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
import { CURRENCIES } from '@/lib/currency'
import { updateTripAction } from '@/app/(app)/trips/actions'

type Trip = {
  id: string
  title: string
  description: string | null
  destination: string | null
  start_date: string | null
  end_date: string | null
  status: 'planning' | 'ongoing' | 'completed' | 'archived'
  base_currency?: string | null
}

type EditTripDialogProps = {
  trip: Trip
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTripDialog({
  trip,
  open,
  onOpenChange,
}: EditTripDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit trip</DialogTitle>
          <DialogDescription>Update detail trip lo</DialogDescription>
        </DialogHeader>

        {/* Key forces remount each time dialog opens, so form state resets */}
        {open && (
          <EditTripForm
            key={`${trip.id}-${open}`}
            trip={trip}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type EditTripFormProps = {
  trip: Trip
  onSuccess: () => void
  onCancel: () => void
}

function EditTripForm({ trip, onSuccess, onCancel }: EditTripFormProps) {
  const [state, formAction, pending] = useActionState(
    updateTripAction.bind(null, trip.id),
    {}
  )

  // Initial values from props — useState init only runs on mount
  const [title, setTitle] = useState(trip.title)
  const [description, setDescription] = useState(trip.description ?? '')
  const [destination, setDestination] = useState(trip.destination ?? '')
  const [startDate, setStartDate] = useState(trip.start_date ?? '')
  const [endDate, setEndDate] = useState(trip.end_date ?? '')
  const [status, setStatus] = useState(trip.status)
  const [baseCurrency, setBaseCurrency] = useState(trip.base_currency ?? 'IDR')

  // Close dialog on success (this effect is fine — it doesn't setState)
  useEffect(() => {
    if (state.success) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="destination">Destinasi</Label>
        <Input
          id="destination"
          name="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_date">Tanggal mulai</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Tanggal selesai</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      {state.fieldErrors?.end_date && (
        <p className="text-sm text-destructive">
          {state.fieldErrors.end_date[0]}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="base_currency">Mata uang utama</Label>
        <select
          id="base_currency"
          name="base_currency"
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="planning">Planning</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

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