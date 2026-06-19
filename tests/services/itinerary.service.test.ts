import { describe, it, expect, vi } from 'vitest'
import {
  listItineraryForTrip,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
} from '@/services/itinerary.service'

/**
 * Mock Supabase whose terminal calls (.maybeSingle / .single) resolve to the
 * queued values in order. Chain methods return the chain so call order doesn't
 * matter. insert/update/delete are tracked for assertions. A `delete().eq()`
 * resolves to the chain object itself, so `{ error }` destructures to undefined
 * (= success), mirroring the real PostgREST builder.
 *
 * NOTE: without RLS (§5), these service-layer auth guards are the only safety
 * net for itinerary data — hence this is a Level 1 critical test (§10).
 */
function createMockSupabase(terminalValues: unknown[]) {
  const queue = [...terminalValues]
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: queue.shift() ?? null, error: null })),
    single: vi.fn(async () => ({ data: queue.shift() ?? null, error: null })),
  }
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return chain as any
}

const validItem = {
  type: 'activity' as const,
  title: 'Snorkeling di Nusa Penida',
}

describe('listItineraryForTrip', () => {
  it('throws when the user is not a member', async () => {
    const supabase = createMockSupabase([null])
    await expect(
      listItineraryForTrip(supabase, 'trip-1', 'user-1')
    ).rejects.toThrow('Trip not found or access denied')
  })

  it('returns items when the user is a member', async () => {
    // membership lookup, then the list query resolves via .order()
    const supabase = createMockSupabase([{ role: 'viewer' }])
    const rows = [{ id: 'i-1', title: 'A' }]
    supabase.order.mockReturnValueOnce(supabase).mockResolvedValueOnce({
      data: rows,
      error: null,
    })
    const result = await listItineraryForTrip(supabase, 'trip-1', 'user-1')
    expect(result).toEqual(rows)
  })
})

describe('createItineraryItem', () => {
  it('throws when the user is not a member', async () => {
    const supabase = createMockSupabase([null])
    await expect(
      createItineraryItem(supabase, 'trip-1', 'user-1', validItem)
    ).rejects.toThrow('Trip not found or access denied')
    expect(supabase.insert).not.toHaveBeenCalled()
  })

  it('throws when the user is only a viewer', async () => {
    const supabase = createMockSupabase([{ role: 'viewer' }])
    await expect(
      createItineraryItem(supabase, 'trip-1', 'user-1', validItem)
    ).rejects.toThrow('do not have permission')
    expect(supabase.insert).not.toHaveBeenCalled()
  })

  it('inserts when the user is an editor', async () => {
    const supabase = createMockSupabase([{ role: 'editor' }, { id: 'i-1' }])
    const result = await createItineraryItem(
      supabase,
      'trip-1',
      'user-1',
      validItem
    )
    expect(supabase.insert).toHaveBeenCalled()
    expect(result).toEqual({ id: 'i-1' })
  })

  it('inserts when the user is the owner', async () => {
    const supabase = createMockSupabase([{ role: 'owner' }, { id: 'i-2' }])
    await createItineraryItem(supabase, 'trip-1', 'user-1', validItem)
    expect(supabase.insert).toHaveBeenCalled()
  })
})

describe('updateItineraryItem', () => {
  it('throws when the item does not exist', async () => {
    const supabase = createMockSupabase([null])
    await expect(
      updateItineraryItem(supabase, 'item-1', 'user-1', { title: 'X' })
    ).rejects.toThrow('Itinerary item not found or access denied')
    expect(supabase.update).not.toHaveBeenCalled()
  })

  it('throws when the user is only a viewer', async () => {
    // item lookup resolves trip_id, then membership is viewer
    const supabase = createMockSupabase([
      { trip_id: 'trip-1' },
      { role: 'viewer' },
    ])
    await expect(
      updateItineraryItem(supabase, 'item-1', 'user-1', { title: 'X' })
    ).rejects.toThrow('do not have permission')
    expect(supabase.update).not.toHaveBeenCalled()
  })

  it('updates when the user is an editor', async () => {
    const supabase = createMockSupabase([
      { trip_id: 'trip-1' },
      { role: 'editor' },
      { id: 'item-1', title: 'X' },
    ])
    const result = await updateItineraryItem(supabase, 'item-1', 'user-1', {
      title: 'X',
    })
    expect(supabase.update).toHaveBeenCalled()
    expect(result).toEqual({ id: 'item-1', title: 'X' })
  })
})

describe('deleteItineraryItem', () => {
  it('throws when the item does not exist', async () => {
    const supabase = createMockSupabase([null])
    await expect(
      deleteItineraryItem(supabase, 'item-1', 'user-1')
    ).rejects.toThrow('Itinerary item not found or access denied')
    expect(supabase.delete).not.toHaveBeenCalled()
  })

  it('throws when the user is only a viewer', async () => {
    const supabase = createMockSupabase([
      { trip_id: 'trip-1' },
      { role: 'viewer' },
    ])
    await expect(
      deleteItineraryItem(supabase, 'item-1', 'user-1')
    ).rejects.toThrow('do not have permission')
    expect(supabase.delete).not.toHaveBeenCalled()
  })

  it('deletes when the user is an editor', async () => {
    const supabase = createMockSupabase([
      { trip_id: 'trip-1' },
      { role: 'editor' },
    ])
    await expect(
      deleteItineraryItem(supabase, 'item-1', 'user-1')
    ).resolves.toBeUndefined()
    expect(supabase.delete).toHaveBeenCalled()
  })
})
