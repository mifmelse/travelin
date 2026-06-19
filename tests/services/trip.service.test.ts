import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTripMembership,
  assertTripMember,
  assertTripEditor,
  assertTripOwner,
} from '@/services/trip.service'

/**
 * Helper: create a mock Supabase client that returns `data` from .maybeSingle()
 */
function createMockSupabase(data: unknown) {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return chain as any
}

describe('getTripMembership', () => {
  it('returns null when user is not a member', async () => {
    const supabase = createMockSupabase(null)
    const result = await getTripMembership(supabase, 'trip-1', 'user-1')
    expect(result).toBeNull()
  })

  it('returns member object when user is a member', async () => {
    const supabase = createMockSupabase({ role: 'editor' })
    const result = await getTripMembership(supabase, 'trip-1', 'user-1')
    expect(result).toEqual({ role: 'editor' })
  })

  it('queries trip_members table with correct filters', async () => {
    const supabase = createMockSupabase({ role: 'owner' })
    await getTripMembership(supabase, 'trip-1', 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('trip_members')
    expect(supabase.eq).toHaveBeenCalledWith('trip_id', 'trip-1')
    expect(supabase.eq).toHaveBeenCalledWith('profile_id', 'user-1')
  })
})

describe('assertTripMember', () => {
  it('throws when user is not a member', async () => {
    const supabase = createMockSupabase(null)
    await expect(
      assertTripMember(supabase, 'trip-1', 'user-1')
    ).rejects.toThrow('Trip not found or access denied')
  })

  it('returns member when user is a member (any role)', async () => {
    const supabase = createMockSupabase({ role: 'viewer' })
    const result = await assertTripMember(supabase, 'trip-1', 'user-1')
    expect(result).toEqual({ role: 'viewer' })
  })
})

describe('assertTripEditor', () => {
  it('throws when user is not a member', async () => {
    const supabase = createMockSupabase(null)
    await expect(
      assertTripEditor(supabase, 'trip-1', 'user-1')
    ).rejects.toThrow('Trip not found or access denied')
  })

  it('throws when user is viewer', async () => {
    const supabase = createMockSupabase({ role: 'viewer' })
    await expect(
      assertTripEditor(supabase, 'trip-1', 'user-1')
    ).rejects.toThrow('do not have permission')
  })

  it('passes when user is editor', async () => {
    const supabase = createMockSupabase({ role: 'editor' })
    const result = await assertTripEditor(supabase, 'trip-1', 'user-1')
    expect(result).toEqual({ role: 'editor' })
  })

  it('passes when user is owner', async () => {
    const supabase = createMockSupabase({ role: 'owner' })
    const result = await assertTripEditor(supabase, 'trip-1', 'user-1')
    expect(result).toEqual({ role: 'owner' })
  })
})

describe('assertTripOwner', () => {
  it('throws when trip does not exist', async () => {
    const supabase = createMockSupabase(null)
    await expect(
      assertTripOwner(supabase, 'trip-1', 'user-1')
    ).rejects.toThrow('Only the trip owner')
  })

  it('throws when user is not the owner', async () => {
    const supabase = createMockSupabase({ owner_id: 'other-user' })
    await expect(
      assertTripOwner(supabase, 'trip-1', 'user-1')
    ).rejects.toThrow('Only the trip owner')
  })

  it('passes when user is the owner', async () => {
    const supabase = createMockSupabase({ owner_id: 'user-1' })
    await expect(
      assertTripOwner(supabase, 'trip-1', 'user-1')
    ).resolves.toBeUndefined()
  })

  it('queries trips table with correct filter', async () => {
    const supabase = createMockSupabase({ owner_id: 'user-1' })
    await assertTripOwner(supabase, 'trip-1', 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('trips')
    expect(supabase.select).toHaveBeenCalledWith('owner_id')
    expect(supabase.eq).toHaveBeenCalledWith('id', 'trip-1')
  })
})

describe('beforeEach mock reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is a placeholder to satisfy beforeEach pattern documentation', () => {
    expect(true).toBe(true)
  })
})
