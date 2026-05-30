import { format, parseISO } from 'date-fns'
import { ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listBookingsForTrip } from '@/services/booking.service'
import { formatCurrency } from '@/lib/format'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { ItemRow } from '@/components/ui/item-row'
import { NewBookingDialog } from '@/components/features/booking/new-booking-dialog'
import { BookingActionsMenu } from '@/components/features/booking/booking-actions-menu'
import {
  bookingTypeMeta,
  type BookingType,
} from '@/components/features/booking/booking-meta'
import type { Booking } from '@/components/features/booking/edit-booking-dialog'

function dateLabel(value: string | null): string | undefined {
  return value ? format(parseISO(value), 'd MMM yyyy') : undefined
}

function subtitleOf(booking: Booking): string | undefined {
  const parts: string[] = []
  if (booking.confirmation_code) parts.push(booking.confirmation_code)
  if (booking.amount_cents != null) {
    parts.push(formatCurrency(booking.amount_cents, booking.currency ?? 'IDR'))
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

export default async function TripBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const bookings = (await listBookingsForTrip(
    supabase,
    id,
    user.id
  )) as Booking[]

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Bookings"
        action={<NewBookingDialog tripId={id} />}
      />

      {bookings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada booking"
          description="Catatan booking dari Traveloka, Booking.com, dst. akan muncul di sini."
        />
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => {
            const meta = bookingTypeMeta(booking.type as BookingType)
            return (
              <ItemRow
                key={booking.id}
                icon={meta.icon}
                iconTone={meta.tone}
                time={dateLabel(booking.booked_at)}
                title={booking.provider ?? meta.label}
                subtitle={subtitleOf(booking)}
                actions={<BookingActionsMenu booking={booking} />}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
