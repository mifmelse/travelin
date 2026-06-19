import { describe, it, expect } from 'vitest'
import { safeRelativePath } from '@/lib/url'

describe('safeRelativePath', () => {
  it('accepts a simple relative path', () => {
    expect(safeRelativePath('/join/abc')).toBe('/join/abc')
  })

  it('accepts a relative path with query string', () => {
    expect(safeRelativePath('/dashboard?tab=1')).toBe('/dashboard?tab=1')
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeRelativePath('//evil.com')).toBeNull()
  })

  it('rejects absolute URLs', () => {
    expect(safeRelativePath('https://evil.com')).toBeNull()
    expect(safeRelativePath('http://evil.com')).toBeNull()
  })

  it('rejects javascript: and other schemes', () => {
    expect(safeRelativePath('javascript:alert(1)')).toBeNull()
  })

  it('rejects paths not starting with a slash', () => {
    expect(safeRelativePath('dashboard')).toBeNull()
  })

  it('rejects null, undefined, empty, and non-strings', () => {
    expect(safeRelativePath(null)).toBeNull()
    expect(safeRelativePath(undefined)).toBeNull()
    expect(safeRelativePath('')).toBeNull()
    expect(safeRelativePath(123)).toBeNull()
  })
})
