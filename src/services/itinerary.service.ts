import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertTripMember, assertTripEditor } from '@/services/trip.service'

// =========================================
// SCHEMAS
// =========================================

const itineraryBaseSchema = z.object({
  type: z.enum(['flight', 'lodging', 'activity', 'transport', 'meal', 'note']),
  title: z
    .string()
    .min(1, 'Judul wajib diisi')
    .max(200, 'Judul maksimal 200 karakter'),
  start_at: z.string().optional().or(z.literal('')),
  end_at: z.string().optional().or(z.literal('')),
  location_name: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

const timeRangeRefine = (data: { start_at?: string; end_at?: string }) => {
  if (!data.start_at || !data.end_at) return true
  return new Date(data.end_at) >= new Date(data.start_at)
}

const timeRangeError = {
  message: 'Waktu selesai harus setelah atau sama dengan waktu mulai',
  path: ['end_at'],
}

export const createItinerarySchema = itineraryBaseSchema.refine(
  timeRangeRefine,
  timeRangeError
)

export const updateItinerarySchema = itineraryBaseSchema
  .partial()
  .refine(timeRangeRefine, timeRangeError)

export type CreateItineraryInput = z.infer<typeof createItinerarySchema>
export type UpdateItineraryInput = z.infer<typeof updateItinerarySchema>

// =========================================
// QUERIES
// =========================================

/**
 * List all itinerary items for a trip. Requires user to be a member.
 * Ordered by start_at (nulls last), then created_at.
 */
export async function listItineraryForTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  await assertTripMember(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('itinerary_items')
    .select(
      'id, trip_id, type, title, start_at, end_at, location_name, notes'
    )
    .eq('trip_id', tripId)
    .order('start_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to list itinerary: ${error.message}`)
  return data
}

/**
 * Fetch a single itinerary item's trip_id (used to authorize by item id).
 * Returns null if not found.
 */
async function getItineraryItemTripId(
  supabase: SupabaseClient<Database>,
  itemId: string
) {
  const { data } = await supabase
    .from('itinerary_items')
    .select('trip_id')
    .eq('id', itemId)
    .maybeSingle()
  return data?.trip_id ?? null
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create an itinerary item under a trip. Requires user to be owner or editor.
 */
export async function createItineraryItem(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  input: CreateItineraryInput
) {
  await assertTripEditor(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('itinerary_items')
    .insert({
      trip_id: tripId,
      type: input.type,
      title: input.title,
      start_at: input.start_at || null,
      end_at: input.end_at || null,
      location_name: input.location_name || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create itinerary item: ${error.message}`)
  return data
}

/**
 * Update an itinerary item. Requires user to be owner or editor of its trip.
 */
export async function updateItineraryItem(
  supabase: SupabaseClient<Database>,
  itemId: string,
  userId: string,
  input: UpdateItineraryInput
) {
  const tripId = await getItineraryItemTripId(supabase, itemId)
  if (!tripId) throw new Error('Itinerary item not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  type ItineraryUpdate =
    Database['public']['Tables']['itinerary_items']['Update']
  const payload: ItineraryUpdate = {}
  if (input.type !== undefined) payload.type = input.type
  if (input.title !== undefined) payload.title = input.title
  if (input.start_at !== undefined) payload.start_at = input.start_at || null
  if (input.end_at !== undefined) payload.end_at = input.end_at || null
  if (input.location_name !== undefined)
    payload.location_name = input.location_name || null
  if (input.notes !== undefined) payload.notes = input.notes || null

  const { data, error } = await supabase
    .from('itinerary_items')
    .update(payload)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update itinerary item: ${error.message}`)
  return data
}

/**
 * Delete an itinerary item. Requires user to be owner or editor of its trip.
 */
export async function deleteItineraryItem(
  supabase: SupabaseClient<Database>,
  itemId: string,
  userId: string
) {
  const tripId = await getItineraryItemTripId(supabase, itemId)
  if (!tripId) throw new Error('Itinerary item not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(`Failed to delete itinerary item: ${error.message}`)
}
