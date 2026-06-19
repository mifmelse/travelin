'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  createItinerarySchema,
  updateItinerarySchema,
} from '@/services/itinerary.service'

export type ActionState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function createItineraryItemAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createItinerarySchema.safeParse({
    type: formData.get('type'),
    title: formData.get('title'),
    start_at: formData.get('start_at'),
    end_at: formData.get('end_at'),
    location_name: formData.get('location_name'),
    notes: formData.get('notes'),
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
    await createItineraryItem(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/itinerary`)
  return { success: true }
}

export async function updateItineraryItemAction(
  tripId: string,
  itemId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateItinerarySchema.safeParse({
    type: formData.get('type'),
    title: formData.get('title'),
    start_at: formData.get('start_at'),
    end_at: formData.get('end_at'),
    location_name: formData.get('location_name'),
    notes: formData.get('notes'),
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
    await updateItineraryItem(supabase, itemId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/itinerary`)
  return { success: true }
}

export async function deleteItineraryItemAction(
  tripId: string,
  itemId: string
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await deleteItineraryItem(supabase, itemId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/itinerary`)
  return { success: true }
}
