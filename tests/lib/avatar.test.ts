import { describe, it, expect } from 'vitest'
import { avatarInitials } from '@/lib/avatar'

describe('avatarInitials', () => {
  it('returns first letter for a single word', () => {
    expect(avatarInitials('Miftah')).toBe('M')
  })

  it('returns first letters of first two words', () => {
    expect(avatarInitials('Miftah Aulia')).toBe('MA')
  })

  it('ignores extra words beyond the second', () => {
    expect(avatarInitials('Miftah Aulia Rahman')).toBe('MA')
  })

  it('uppercases the result', () => {
    expect(avatarInitials('miftah aulia')).toBe('MA')
  })

  it('falls back to ? for empty input', () => {
    expect(avatarInitials('')).toBe('?')
    expect(avatarInitials('   ')).toBe('?')
    expect(avatarInitials(null)).toBe('?')
    expect(avatarInitials(undefined)).toBe('?')
  })
})
