import { describe, it, expect } from 'vitest'
import { resolveTheme, type ThemePreference } from '@/lib/theme'

describe('resolveTheme', () => {
  it('returns "light" when preference is light, regardless of system', () => {
    expect(resolveTheme('light', 'light')).toBe('light')
    expect(resolveTheme('light', 'dark')).toBe('light')
  })

  it('returns "dark" when preference is dark, regardless of system', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark')
    expect(resolveTheme('dark', 'dark')).toBe('dark')
  })

  it('returns system when preference is "system"', () => {
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('system', 'dark')).toBe('dark')
  })

  it('defaults to light if preference is unknown', () => {
    expect(resolveTheme('weird' as ThemePreference, 'dark')).toBe('light')
  })
})
