import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { CURRENCIES } from '@/lib/currency'

// =========================================
// SCHEMAS
// =========================================

const tripBaseSchema = z.object({
  title: z
    .string()
    .min(1, 'Judul trip wajib diisi')
    .max(100, 'Judul maksimal 100 karakter'),
  description: z.string().max(500).optional().or(z.literal('')),
  destination: z.string().max(100).optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  base_currency: z.enum(CURRENCIES).optional(),
})

const dateRangeRefine = (data: {
  start_date?: string
  end_date?: string
}) => {
  if (!data.start_date || !data.end_date) return true
  return new Date(data.end_date) >= new Date(data.start_date)
}

const dateRangeError = {
  message: 'Tanggal selesai harus setelah atau sama dengan tanggal mulai',
  path: ['end_date'],
}

export const createTripSchema = tripBaseSchema.refine(
  dateRangeRefine,
  dateRangeError
)

export const updateTripSchema = tripBaseSchema
  .partial()
  .extend({
    status: z.enum(['planning', 'ongoing', 'completed', 'archived']).optional(),
  })
  .refine(dateRangeRefine, dateRangeError)

export type CreateTripInput = z.infer<typeof createTripSchema>
export type UpdateTripInput = z.infer<typeof updateTripSchema>

// =========================================
// AUTHORIZATION HELPERS
// =========================================

/**
 * Check if a user is a member of a trip.
 * Returns the member record or null.
 */
export async function getTripMembership(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  const { data } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('profile_id', userId)
    .maybeSingle()
  return data
}

/**
 * Throw if user is not a member of the trip.
 */
export async function assertTripMember(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  const member = await getTripMembership(supabase, tripId, userId)
  if (!member) {
    throw new Error('Trip not found or access denied')
  }
  return member
}

/**
 * Throw if user cannot edit the trip (must be owner or editor).
 */
export async function assertTripEditor(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  const member = await assertTripMember(supabase, tripId, userId)
  if (member.role !== 'owner' && member.role !== 'editor') {
    throw new Error('You do not have permission to edit this trip')
  }
  return member
}

/**
 * Throw if user is not the owner of the trip.
 */
export async function assertTripOwner(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  const { data } = await supabase
    .from('trips')
    .select('owner_id')
    .eq('id', tripId)
    .maybeSingle()
  if (!data || data.owner_id !== userId) {
    throw new Error('Only the trip owner can perform this action')
  }
}

// =========================================
// QUERIES
// =========================================

/**
 * List all trips the user is a member of.
 * App-level filter: only returns trips where user is in trip_members.
 */
export async function listTripsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      id, title, description, destination, 
      start_date, end_date, status, cover_image_url, created_at,
      trip_members!inner(profile_id)
      `
    )
    .eq('trip_members.profile_id', userId)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list trips: ${error.message}`)
  return data
}

/**
 * Get a trip by id, but only if user is a member.
 * Returns null if not found or no access.
 */
export async function getTripById(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  // Check membership first
  const member = await getTripMembership(supabase, tripId, userId)
  if (!member) return null

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch trip: ${error.message}`)
  return data
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create a new trip. Caller is automatically added as owner.
 */
export async function createTrip(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  input: CreateTripInput
) {
  const payload = {
    owner_id: ownerId,
    title: input.title,
    description: input.description || null,
    destination: input.destination || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    base_currency: input.base_currency || 'IDR',
  }

  // 1. Insert trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert(payload)
    .select()
    .single()

  if (tripError) {
    throw new Error(`Failed to create trip: ${tripError.message}`)
  }

  // 2. Add owner as trip member
  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: trip.id,
      profile_id: ownerId,
      role: 'owner',
    })

  if (memberError) {
    // Rollback: delete the trip
    await supabase.from('trips').delete().eq('id', trip.id)
    throw new Error(`Failed to add owner as member: ${memberError.message}`)
  }

  return trip
}

/**
 * Update an existing trip. Requires user to be owner or editor.
 */
export async function updateTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  input: UpdateTripInput
) {
  await assertTripEditor(supabase, tripId, userId)

  type TripUpdate = Database['public']['Tables']['trips']['Update']
  const payload: TripUpdate = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.description !== undefined) payload.description = input.description || null
  if (input.destination !== undefined) payload.destination = input.destination || null
  if (input.start_date !== undefined) payload.start_date = input.start_date || null
  if (input.end_date !== undefined) payload.end_date = input.end_date || null
  if (input.base_currency !== undefined)
    payload.base_currency = input.base_currency
  if (input.status !== undefined) payload.status = input.status

  const { data, error } = await supabase
    .from('trips')
    .update(payload)
    .eq('id', tripId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update trip: ${error.message}`)
  return data
}

/**
 * Delete a trip. Only the owner can delete.
 */
export async function deleteTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  await assertTripOwner(supabase, tripId, userId)

  const { error } = await supabase.from('trips').delete().eq('id', tripId)
  if (error) throw new Error(`Failed to delete trip: ${error.message}`)
}