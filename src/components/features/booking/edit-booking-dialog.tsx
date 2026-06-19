'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  BOOKING_TYPES,
  BOOKING_CURRENCIES,
  type BookingType,
  type BookingCurrency,
} from './booking-meta'
import { updateBookingAction } from '@/app/(app)/trips/[id]/bookings/actions'
import { useTrip } from '@/components/features/trip/trip-context'

export type Booking = {
  id: string
  trip_id: string
  type: BookingType
  provider: string | null
  confirmation_code: string | null
  booked_at: string | null
  amount_cents: number | null
  currency: string | null
  exchange_rate: number | null
}

// Convert a stored timestamptz string to a value for <input type="datetime-local">.
function toDatetimeLocal(value: string | null): string {
  return value ? value.slice(0, 16) : ''
}

// Convert stored integer cents back to a whole-unit string for the amount input.
function toAmountInput(amountCents: number | null): string {
  return amountCents == null ? '' : String(Math.round(amountCents / 100))
}

type EditBookingDialogProps = {
  booking: Booking
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditBookingDialog({
  booking,
  open,
  onOpenChange,
}: EditBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit booking</DialogTitle>
          <DialogDescription>Update detail catatan booking</DialogDescription>
        </DialogHeader>

        {/* Key forces remount each time dialog opens, so form state resets */}
        {open && (
          <EditBookingForm
            key={`${booking.id}-${open}`}
            booking={booking}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditBookingForm({
  booking,
  onSuccess,
  onCancel,
}: {
  booking: Booking
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(
    updateBookingAction.bind(null, booking.trip_id, booking.id),
    {}
  )

  const [type, setType] = useState<BookingType>(booking.type)
  const [provider, setProvider] = useState(booking.provider ?? '')
  const [confirmationCode, setConfirmationCode] = useState(
    booking.confirmation_code ?? ''
  )
  const [bookedAt, setBookedAt] = useState(toDatetimeLocal(booking.booked_at))
  const [amount, setAmount] = useState(toAmountInput(booking.amount_cents))
  const [currency, setCurrency] = useState<BookingCurrency>(
    (booking.currency as BookingCurrency) ?? 'IDR'
  )
  const baseCurrency = useTrip().base_currency
  const [rate, setRate] = useState(
    booking.exchange_rate != null ? String(booking.exchange_rate) : ''
  )
  const showRate = currency !== baseCurrency

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
          onChange={(e) => setType(e.target.value as BookingType)}
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
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
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
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
        />
        {state.fieldErrors?.confirmation_code && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.confirmation_code[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booked_at">Tanggal booking</Label>
        <Input
          id="booked_at"
          name="booked_at"
          type="datetime-local"
          value={bookedAt}
          onChange={(e) => setBookedAt(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Jumlah</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            value={currency}
            onChange={(e) => setCurrency(e.target.value as BookingCurrency)}
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

      {showRate && (
        <div className="space-y-2">
          <Label htmlFor="exchange_rate">
            Kurs ke {baseCurrency} (opsional)
          </Label>
          <Input
            id="exchange_rate"
            name="exchange_rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={`1 ${currency} = ? ${baseCurrency}`}
          />
          {state.fieldErrors?.exchange_rate && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.exchange_rate[0]}
            </p>
          )}
        </div>
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
