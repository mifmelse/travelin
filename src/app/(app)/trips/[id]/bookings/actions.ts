'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createBooking,
  updateBooking,
  deleteBooking,
  createBookingSchema,
  updateBookingSchema,
} from '@/services/booking.service'

export type ActionState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function createBookingAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createBookingSchema.safeParse({
    type: formData.get('type'),
    provider: formData.get('provider'),
    confirmation_code: formData.get('confirmation_code'),
    booked_at: formData.get('booked_at'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    // The exchange_rate input is only rendered for non-base currencies, so it
    // may be absent; treat absent as undefined.
    exchange_rate: formData.get('exchange_rate') ?? undefined,
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await createBooking(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/bookings`)
  return { success: true }
}

export async function updateBookingAction(
  tripId: string,
  bookingId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateBookingSchema.safeParse({
    type: formData.get('type'),
    provider: formData.get('provider'),
    confirmation_code: formData.get('confirmation_code'),
    booked_at: formData.get('booked_at'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    // The exchange_rate input is only rendered for non-base currencies, so it
    // may be absent; treat absent as undefined.
    exchange_rate: formData.get('exchange_rate') ?? undefined,
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await updateBooking(supabase, bookingId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/bookings`)
  return { success: true }
}

export async function deleteBookingAction(
  tripId: string,
  bookingId: string
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await deleteBooking(supabase, bookingId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/bookings`)
  return { success: true }
}
