import { describe, it, expect } from 'vitest'
import { createPostSchema, commentSchema } from '@/services/post.service'

describe('createPostSchema', () => {
  it('rejects a post with no body and no media', () => {
    const r = createPostSchema.safeParse({ body: '', location_name: '', media_count: 0 })
    expect(r.success).toBe(false)
  })
  it('accepts a text-only post', () => {
    const r = createPostSchema.safeParse({ body: 'Halo', media_count: 0 })
    expect(r.success).toBe(true)
  })
  it('accepts a media-only post', () => {
    const r = createPostSchema.safeParse({ body: '', media_count: 2 })
    expect(r.success).toBe(true)
  })
  it('rejects a caption over the length limit', () => {
    const r = createPostSchema.safeParse({ body: 'x'.repeat(2001), media_count: 0 })
    expect(r.success).toBe(false)
  })
})

describe('commentSchema', () => {
  it('rejects an empty body', () => {
    expect(commentSchema.safeParse({ body: '' }).success).toBe(false)
  })
  it('accepts a non-empty body', () => {
    expect(commentSchema.safeParse({ body: 'mantap' }).success).toBe(true)
  })
})
