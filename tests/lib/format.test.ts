import { describe, it, expect } from 'vitest'
import { formatTripDateRange, formatCurrency } from '@/lib/format'

describe('formatTripDateRange', () => {
  it('returns placeholder when both dates are null', () => {
    expect(formatTripDateRange(null, null)).toBe('Tanggal belum diisi')
  })

  it('returns "Mulai ..." when only start date is set', () => {
    expect(formatTripDateRange('2026-05-15', null)).toBe('Mulai 15 May 2026')
  })

  it('returns "Sampai ..." when only end date is set', () => {
    expect(formatTripDateRange(null, '2026-05-20')).toBe('Sampai 20 May 2026')
  })

  it('formats range when start and end are in same month', () => {
    expect(formatTripDateRange('2026-05-05', '2026-05-12')).toBe(
      '5–12 May 2026'
    )
  })

  it('formats range when start and end are in same year, different month', () => {
    expect(formatTripDateRange('2026-05-05', '2026-06-12')).toBe(
      '5 May – 12 Jun 2026'
    )
  })

  it('formats range when start and end are in different year', () => {
    expect(formatTripDateRange('2025-12-28', '2026-01-05')).toBe(
      '28 Dec 2025 – 5 Jan 2026'
    )
  })

  it('handles same-day range (start === end)', () => {
    expect(formatTripDateRange('2026-05-15', '2026-05-15')).toBe(
      '15–15 May 2026'
    )
  })
})

describe('formatCurrency', () => {
  it('formats IDR by default (cents to rupiah)', () => {
    // 15000000 cents = Rp 150.000
    // Note: Intl uses non-breaking space (U+00A0) between symbol and number in id-ID
    const result = formatCurrency(15000000)
    expect(result).toMatch(/^Rp\s150\.000$/)
  })

  it('formats zero amount', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/^Rp\s0$/)
  })

  it('formats large amount', () => {
    // 1234567890 cents = Rp 12.345.679 (rounded)
    const result = formatCurrency(1234567890)
    expect(result).toMatch(/^Rp\s12\.345\.679$/)
  })

  it('drops fractional cents (uses maximumFractionDigits: 0)', () => {
    // 12345 cents = Rp 123.45 → rounded to Rp 123
    const result = formatCurrency(12345)
    expect(result).toMatch(/^Rp\s123$/)
  })

  it('accepts different currency code', () => {
    // Just verify it doesn't throw and produces a string
    const result = formatCurrency(15000000, 'USD')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

