import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertTripMember, assertTripEditor } from '@/services/trip.service'
import { parseAmountToCents } from '@/lib/format'
import { BOOKING_CURRENCIES } from '@/components/features/booking/booking-meta'

// =========================================
// SCHEMAS
// =========================================

const bookingBaseSchema = z.object({
  type: z.enum(['flight', 'lodging', 'activity', 'transport', 'other']),
  provider: z.string().max(200, 'Provider maksimal 200 karakter').optional().or(z.literal('')),
  confirmation_code: z
    .string()
    .max(200, 'Kode konfirmasi maksimal 200 karakter')
    .optional()
    .or(z.literal('')),
  booked_at: z.string().optional().or(z.literal('')),
  amount: z
    .string()
    .regex(/^\d+$/, 'Jumlah harus angka bulat tanpa desimal')
    .optional()
    .or(z.literal('')),
  // Optional manual exchange rate to the trip's base currency. Whole or decimal.
  exchange_rate: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Kurs harus berupa angka')
    .optional()
    .or(z.literal('')),
  currency: z.enum(BOOKING_CURRENCIES),
})

export const createBookingSchema = bookingBaseSchema
export const updateBookingSchema = bookingBaseSchema.partial()

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>

// =========================================
// QUERIES
// =========================================

/**
 * List all booking records for a trip. Requires user to be a member.
 * Ordered by booked_at (nulls last), then created_at.
 */
export async function listBookingsForTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  await assertTripMember(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, trip_id, type, provider, confirmation_code, booked_at, amount_cents, currency, exchange_rate'
    )
    .eq('trip_id', tripId)
    .order('booked_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to list bookings: ${error.message}`)
  return data
}

/**
 * Fetch a single booking's trip_id (used to authorize by booking id).
 * Returns null if not found.
 */
async function getBookingTripId(
  supabase: SupabaseClient<Database>,
  bookingId: string
) {
  const { data } = await supabase
    .from('bookings')
    .select('trip_id')
    .eq('id', bookingId)
    .maybeSingle()
  return data?.trip_id ?? null
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create a booking record under a trip. Requires user to be owner or editor.
 */
export async function createBooking(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  input: CreateBookingInput
) {
  await assertTripEditor(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      trip_id: tripId,
      type: input.type,
      provider: input.provider || null,
      confirmation_code: input.confirmation_code || null,
      booked_at: input.booked_at || null,
      amount_cents: parseAmountToCents(input.amount),
      currency: input.currency,
      exchange_rate: input.exchange_rate ? Number(input.exchange_rate) : null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create booking: ${error.message}`)
  return data
}

/**
 * Update a booking record. Requires user to be owner or editor of its trip.
 */
export async function updateBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  userId: string,
  input: UpdateBookingInput
) {
  const tripId = await getBookingTripId(supabase, bookingId)
  if (!tripId) throw new Error('Booking not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  type BookingUpdate = Database['public']['Tables']['bookings']['Update']
  const payload: BookingUpdate = {}
  if (input.type !== undefined) payload.type = input.type
  if (input.provider !== undefined) payload.provider = input.provider || null
  if (input.confirmation_code !== undefined)
    payload.confirmation_code = input.confirmation_code || null
  if (input.booked_at !== undefined) payload.booked_at = input.booked_at || null
  if (input.amount !== undefined)
    payload.amount_cents = parseAmountToCents(input.amount)
  if (input.currency !== undefined) payload.currency = input.currency
  if (input.exchange_rate !== undefined)
    payload.exchange_rate = input.exchange_rate
      ? Number(input.exchange_rate)
      : null

  const { data, error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update booking: ${error.message}`)
  return data
}

/**
 * Delete a booking record. Requires user to be owner or editor of its trip.
 */
export async function deleteBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  userId: string
) {
  const tripId = await getBookingTripId(supabase, bookingId)
  if (!tripId) throw new Error('Booking not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  const { error } = await supabase.from('bookings').delete().eq('id', bookingId)

  if (error) throw new Error(`Failed to delete booking: ${error.message}`)
}
