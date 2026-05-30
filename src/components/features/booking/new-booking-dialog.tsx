'use client'

import { useState, useActionState, useEffect } from 'react'
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
import { BOOKING_TYPES, BOOKING_CURRENCIES } from './booking-meta'
import {
  createBookingAction,
  type ActionState,
} from '@/app/(app)/trips/[id]/bookings/actions'

export function NewBookingDialog({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        Tambah booking
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tambah booking</DialogTitle>
          <DialogDescription>
            Catat konfirmasi dari Traveloka, Booking.com, maskapai, dst.
          </DialogDescription>
        </DialogHeader>
        {/* key remounts the form so fields reset each time dialog opens */}
        {open && (
          <NewBookingForm
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

function NewBookingForm({
  tripId,
  onSuccess,
  onCancel,
}: {
  tripId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createBookingAction.bind(null, tripId),
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
          defaultValue="flight"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {BOOKING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Input
          id="provider"
          name="provider"
          placeholder="Traveloka, Garuda, Booking.com..."
          autoFocus
        />
        {state.fieldErrors?.provider && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.provider[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmation_code">Kode konfirmasi</Label>
        <Input
          id="confirmation_code"
          name="confirmation_code"
          placeholder="ABC123XYZ"
        />
        {state.fieldErrors?.confirmation_code && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.confirmation_code[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booked_at">Tanggal booking</Label>
        <Input id="booked_at" name="booked_at" type="datetime-local" />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Jumlah</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="numeric"
            placeholder="150000"
          />
          {state.fieldErrors?.amount && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.amount[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Mata uang</Label>
          <select
            id="currency"
            name="currency"
            defaultValue="IDR"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {BOOKING_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
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
