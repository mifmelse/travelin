'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createTrip as createTripService,
  updateTrip as updateTripService,
  deleteTrip as deleteTripService,
  createTripSchema,
  updateTripSchema,
} from '@/services/trip.service'

export type ActionState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function createTripAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createTripSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    destination: formData.get('destination'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    base_currency: formData.get('base_currency') || undefined,
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  let trip
  try {
    trip = await createTripService(supabase, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath('/dashboard')
  redirect(`/trips/${trip.id}`)
}

export async function updateTripAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateTripSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    destination: formData.get('destination'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    base_currency: formData.get('base_currency') || undefined,
    status: formData.get('status') || undefined,
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
    await updateTripService(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}

export async function deleteTripAction(tripId: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await deleteTripService(supabase, tripId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}