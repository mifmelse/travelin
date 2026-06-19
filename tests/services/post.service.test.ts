import { describe, it, expect, vi } from 'vitest'
import {
  listPostsForTrip,
  toggleReaction,
  addComment,
  deleteComment,
} from '@/services/post.service'

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

describe('listPostsForTrip', () => {
  it('throws when the user is not a member', async () => {
    const supabase = createMockSupabase([null]) // membership lookup -> null
    await expect(listPostsForTrip(supabase, 'trip-1', 'user-1')).rejects.toThrow(
      'Trip not found or access denied'
    )
  })
})

describe('toggleReaction', () => {
  it('throws when the post does not exist', async () => {
    const supabase = createMockSupabase([null]) // getPostTripId -> null
    await expect(toggleReaction(supabase, 'post-1', 'user-1')).rejects.toThrow(
      'Post not found or access denied'
    )
  })

  it('throws when the user is only a viewer', async () => {
    // getPostTripId -> trip, then assertTripEditor membership -> viewer
    const supabase = createMockSupabase([{ trip_id: 'trip-1' }, { role: 'viewer' }])
    await expect(toggleReaction(supabase, 'post-1', 'user-1')).rejects.toThrow(
      /permission/i
    )
  })
})

describe('addComment flattening', () => {
  it('attaches a reply-to-a-reply to its top-level ancestor', async () => {
    // getPostTripId -> trip; assertTripEditor -> editor; parent lookup -> a reply
    // whose parent_comment_id is 'top-1'; then insert returns the new comment.
    const supabase = createMockSupabase([
      { trip_id: 'trip-1' },
      { role: 'editor' },
      { id: 'reply-1', post_id: 'post-1', parent_comment_id: 'top-1' },
      { id: 'new-1' },
    ])
    await addComment(supabase, 'post-1', 'user-1', {
      body: 'balasan',
      parent_comment_id: 'reply-1',
    })
    const insertArg = supabase.insert.mock.calls.at(-1)?.[0]
    expect(insertArg.parent_comment_id).toBe('top-1')
  })
})

describe('deleteComment', () => {
  it('throws when the comment is missing', async () => {
    const supabase = createMockSupabase([null]) // assertCommentAuthorOrTripOwner lookup
    await expect(deleteComment(supabase, 'c-1', 'user-1')).rejects.toThrow(
      'Comment not found or access denied'
    )
  })
})
