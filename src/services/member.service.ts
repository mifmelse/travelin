import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  assertTripMember,
  assertTripOwner,
  getTripMembership,
} from '@/services/trip.service'

// =========================================
// SCHEMAS / TYPES
// =========================================

export const memberRoleSchema = z.enum(['editor', 'viewer'])
export type MemberRole = z.infer<typeof memberRoleSchema>

export type TripMemberWithProfile = {
  profile_id: string
  role: 'owner' | 'editor' | 'viewer'
  display_name: string
  avatar_url: string | null
}

export type TripInvite = {
  token: string
  role: 'editor' | 'viewer'
}

export type InvitePreview = {
  tripId: string
  role: 'editor' | 'viewer'
  trip: {
    title: string
    destination: string | null
    start_date: string | null
    end_date: string | null
  }
}

const ROLE_ORDER: Record<TripMemberWithProfile['role'], number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
}

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

// =========================================
// QUERIES
// =========================================

/**
 * List members of a trip with their profile info. Requires the caller to be a
 * member. Owner is returned first, then editors, then viewers (alpha within).
 */
export async function listTripMembers(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<TripMemberWithProfile[]> {
  await assertTripMember(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_members')
    .select('profile_id, role, profiles!inner(display_name, avatar_url)')
    .eq('trip_id', tripId)

  if (error) throw new Error(`Failed to list members: ${error.message}`)

  const members: TripMemberWithProfile[] = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      profile_id: row.profile_id,
      role: row.role as TripMemberWithProfile['role'],
      display_name: profile?.display_name ?? 'Traveler',
      avatar_url: profile?.avatar_url ?? null,
    }
  })

  return members.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.display_name.localeCompare(b.display_name)
  )
}

/**
 * Look up an invite by token and return a trip preview for the join page.
 * NO authorization assert by design: the token itself is the capability, and the
 * caller may not yet be a member of the trip. Returns null for unknown/revoked.
 */
export async function getInvitePreview(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<InvitePreview | null> {
  const { data, error } = await supabase
    .from('trip_invites')
    .select('trip_id, role, trips!inner(title, destination, start_date, end_date)')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch invite: ${error.message}`)
  if (!data) return null

  const trip = Array.isArray(data.trips) ? data.trips[0] : data.trips
  return {
    tripId: data.trip_id,
    role: data.role as 'editor' | 'viewer',
    trip: {
      title: trip?.title ?? 'Trip',
      destination: trip?.destination ?? null,
      start_date: trip?.start_date ?? null,
      end_date: trip?.end_date ?? null,
    },
  }
}

/**
 * Get the active invite link for a trip. Owner only. Returns null if none.
 */
export async function getInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<TripInvite | null> {
  await assertTripOwner(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_invites')
    .select('token, role')
    .eq('trip_id', tripId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch invite: ${error.message}`)
  return data as TripInvite | null
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create or regenerate the trip's invite link (new token each call). Owner only.
 */
export async function upsertInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  role: MemberRole
): Promise<TripInvite> {
  await assertTripOwner(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_invites')
    .upsert(
      { trip_id: tripId, token: generateToken(), role, created_by: userId },
      { onConflict: 'trip_id' }
    )
    .select('token, role')
    .single()

  if (error) throw new Error(`Failed to create invite: ${error.message}`)
  return data as TripInvite
}

/**
 * Change the role the active invite grants (no token change). Owner only.
 */
export async function setInviteRole(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  role: MemberRole
): Promise<TripInvite> {
  await assertTripOwner(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_invites')
    .update({ role })
    .eq('trip_id', tripId)
    .select('token, role')
    .maybeSingle()

  if (error) throw new Error(`Failed to update invite role: ${error.message}`)
  if (!data) throw new Error('Belum ada link undangan untuk diubah')
  return data as TripInvite
}

/**
 * Revoke (delete) the trip's invite link. Owner only.
 */
export async function revokeInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<void> {
  await assertTripOwner(supabase, tripId, userId)

  const { error } = await supabase
    .from('trip_invites')
    .delete()
    .eq('trip_id', tripId)

  if (error) throw new Error(`Failed to revoke invite: ${error.message}`)
}

/**
 * Join a trip via an invite token. Any authenticated user. Idempotent: if the
 * user is already a member, returns alreadyMember = true without inserting.
 */
export async function joinTripViaToken(
  supabase: SupabaseClient<Database>,
  token: string,
  userId: string
): Promise<{ tripId: string; alreadyMember: boolean }> {
  const { data: invite, error } = await supabase
    .from('trip_invites')
    .select('trip_id, role')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(`Failed to look up invite: ${error.message}`)
  if (!invite) {
    throw new Error('Link undangan tidak valid atau sudah dinonaktifkan')
  }

  const existing = await getTripMembership(supabase, invite.trip_id, userId)
  if (existing) return { tripId: invite.trip_id, alreadyMember: true }

  // invite.role is `text` (CHECK-constrained to 'editor'|'viewer') in the DB, but
  // trip_members.role is the `trip_role` enum. Narrow the known-good value.
  const role = invite.role as MemberRole
  const { error: insertError } = await supabase.from('trip_members').insert({
    trip_id: invite.trip_id,
    profile_id: userId,
    role,
  })

  if (insertError) throw new Error(`Failed to join trip: ${insertError.message}`)
  return { tripId: invite.trip_id, alreadyMember: false }
}

/**
 * Remove a member from a trip. Owner only. Cannot remove the owner.
 */
export async function removeMember(
  supabase: SupabaseClient<Database>,
  tripId: string,
  memberProfileId: string,
  userId: string
): Promise<void> {
  await assertTripOwner(supabase, tripId, userId)
  // assertTripOwner guarantees userId === trip.owner_id, so the owner row is userId.
  if (memberProfileId === userId) {
    throw new Error('Owner tidak bisa dikeluarkan dari trip')
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('profile_id', memberProfileId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)
}

/**
 * Change a member's role (editor <-> viewer). Owner only. Cannot change owner.
 */
export async function updateMemberRole(
  supabase: SupabaseClient<Database>,
  tripId: string,
  memberProfileId: string,
  role: MemberRole,
  userId: string
): Promise<void> {
  await assertTripOwner(supabase, tripId, userId)
  if (memberProfileId === userId) {
    throw new Error('Role owner tidak bisa diubah')
  }

  const { error } = await supabase
    .from('trip_members')
    .update({ role })
    .eq('trip_id', tripId)
    .eq('profile_id', memberProfileId)

  if (error) throw new Error(`Failed to update member role: ${error.message}`)
}

/**
 * Leave a trip. Any member except the owner (owner must delete the trip).
 */
export async function leaveTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<void> {
  const member = await assertTripMember(supabase, tripId, userId)
  if (member.role === 'owner') {
    throw new Error('Owner tidak bisa keluar dari trip; hapus trip sebagai gantinya')
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('profile_id', userId)

  if (error) throw new Error(`Failed to leave trip: ${error.message}`)
}
