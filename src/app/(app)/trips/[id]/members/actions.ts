'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  upsertInvite,
  setInviteRole,
  revokeInvite,
  removeMember,
  updateMemberRole,
  leaveTrip,
  memberRoleSchema,
} from '@/services/member.service'

export type ActionState = {
  error?: string
  success?: boolean
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function generateInviteAction(
  tripId: string,
  role: 'editor' | 'viewer'
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Role tidak valid' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await upsertInvite(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function setInviteRoleAction(
  tripId: string,
  role: 'editor' | 'viewer'
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Role tidak valid' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await setInviteRole(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function revokeInviteAction(tripId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await revokeInvite(supabase, tripId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function removeMemberAction(
  tripId: string,
  memberProfileId: string
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await removeMember(supabase, tripId, memberProfileId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function updateMemberRoleAction(
  tripId: string,
  memberProfileId: string,
  role: 'editor' | 'viewer'
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Role tidak valid' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await updateMemberRole(supabase, tripId, memberProfileId, parsed.data, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function leaveTripAction(tripId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await leaveTrip(supabase, tripId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
