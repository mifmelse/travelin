import { describe, it, expect, vi } from 'vitest'
import {
  leaveTrip,
  removeMember,
  updateMemberRole,
  upsertInvite,
  revokeInvite,
  joinTripViaToken,
} from '@/services/member.service'

/**
 * Mock Supabase whose terminal calls (.maybeSingle / .single) resolve to the
 * queued values in order. Chain methods return the chain so call order doesn't
 * matter. insert/update/delete/upsert are tracked for assertions.
 */
function createMockSupabase(maybeSingleValues: unknown[]) {
  const queue = [...maybeSingleValues]
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: queue.shift() ?? null, error: null })),
    single: vi.fn(async () => ({ data: queue.shift() ?? null, error: null })),
  }
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.upsert.mockReturnValue(chain)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return chain as any
}

describe('leaveTrip', () => {
  it('throws when the owner tries to leave', async () => {
    const supabase = createMockSupabase([{ role: 'owner' }])
    await expect(leaveTrip(supabase, 'trip-1', 'user-1')).rejects.toThrow(
      'Owner tidak bisa keluar'
    )
  })

  it('allows a non-owner member to leave', async () => {
    const supabase = createMockSupabase([{ role: 'editor' }])
    await expect(leaveTrip(supabase, 'trip-1', 'user-1')).resolves.toBeUndefined()
    expect(supabase.delete).toHaveBeenCalled()
  })
})

describe('removeMember', () => {
  it('throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(
      removeMember(supabase, 'trip-1', 'target', 'user-1')
    ).rejects.toThrow('Only the trip owner')
  })

  it('throws when trying to remove the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'user-1' }])
    await expect(
      removeMember(supabase, 'trip-1', 'user-1', 'user-1')
    ).rejects.toThrow('Owner tidak bisa dikeluarkan')
  })

  it('removes a non-owner member when caller is owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'user-1' }])
    await expect(
      removeMember(supabase, 'trip-1', 'target', 'user-1')
    ).resolves.toBeUndefined()
    expect(supabase.delete).toHaveBeenCalled()
  })
})

describe('updateMemberRole', () => {
  it('throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(
      updateMemberRole(supabase, 'trip-1', 'target', 'viewer', 'user-1')
    ).rejects.toThrow('Only the trip owner')
  })

  it('throws when changing the owner role', async () => {
    const supabase = createMockSupabase([{ owner_id: 'user-1' }])
    await expect(
      updateMemberRole(supabase, 'trip-1', 'user-1', 'viewer', 'user-1')
    ).rejects.toThrow('Role owner tidak bisa diubah')
  })
})

describe('upsertInvite / revokeInvite', () => {
  it('upsertInvite throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(
      upsertInvite(supabase, 'trip-1', 'user-1', 'editor')
    ).rejects.toThrow('Only the trip owner')
  })

  it('revokeInvite throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(revokeInvite(supabase, 'trip-1', 'user-1')).rejects.toThrow(
      'Only the trip owner'
    )
  })
})

describe('joinTripViaToken', () => {
  it('throws on an unknown/revoked token', async () => {
    const supabase = createMockSupabase([null])
    await expect(joinTripViaToken(supabase, 'bad-token', 'user-1')).rejects.toThrow(
      'tidak valid'
    )
  })

  it('is idempotent when already a member', async () => {
    const supabase = createMockSupabase([
      { trip_id: 'trip-1', role: 'editor' },
      { role: 'editor' },
    ])
    const result = await joinTripViaToken(supabase, 'tok', 'user-1')
    expect(result).toEqual({ tripId: 'trip-1', alreadyMember: true })
    expect(supabase.insert).not.toHaveBeenCalled()
  })

  it('inserts membership when not yet a member', async () => {
    const supabase = createMockSupabase([
      { trip_id: 'trip-1', role: 'viewer' },
      null,
    ])
    const result = await joinTripViaToken(supabase, 'tok', 'user-1')
    expect(result).toEqual({ tripId: 'trip-1', alreadyMember: false })
    expect(supabase.insert).toHaveBeenCalledWith({
      trip_id: 'trip-1',
      profile_id: 'user-1',
      role: 'viewer',
    })
  })
})
