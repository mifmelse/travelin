import { describe, it, expect } from 'vitest'
import {
  mediaTypeForMime,
  validateMediaFile,
  buildMediaPath,
  MEDIA_LIMITS,
} from '@/lib/storage'

describe('mediaTypeForMime', () => {
  it('maps image/* to image', () => {
    expect(mediaTypeForMime('image/jpeg')).toBe('image')
  })
  it('maps video/* to video', () => {
    expect(mediaTypeForMime('video/mp4')).toBe('video')
  })
  it('returns null for unsupported types', () => {
    expect(mediaTypeForMime('application/pdf')).toBeNull()
  })
})

describe('validateMediaFile', () => {
  it('accepts an image under the image limit', () => {
    expect(
      validateMediaFile({ type: 'image/png', size: MEDIA_LIMITS.maxImageBytes - 1 })
    ).toBeNull()
  })
  it('rejects an image over the image limit', () => {
    expect(
      validateMediaFile({ type: 'image/png', size: MEDIA_LIMITS.maxImageBytes + 1 })
    ).toMatch(/maksimal/i)
  })
  it('rejects a video over the video limit', () => {
    expect(
      validateMediaFile({ type: 'video/mp4', size: MEDIA_LIMITS.maxVideoBytes + 1 })
    ).toMatch(/maksimal/i)
  })
  it('rejects an unsupported type', () => {
    expect(validateMediaFile({ type: 'text/plain', size: 10 })).toMatch(/tidak didukung/i)
  })
})

describe('buildMediaPath', () => {
  it('builds a trip/post-scoped path with the given id and extension', () => {
    expect(buildMediaPath('t1', 'p1', 'abc', 'jpg')).toBe(
      'trips/t1/posts/p1/abc.jpg'
    )
  })
})
