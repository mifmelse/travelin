import { describe, it, expect } from 'vitest'
import {
  buildTripSpendReport,
  type SpendBooking,
  type SpendExpense,
} from '@/lib/trip-spend'

// Helpers keep each test focused on the field under test.
function booking(p: Partial<SpendBooking>): SpendBooking {
  return {
    bucket: 'lodging',
    amount_cents: 10000,
    currency: 'IDR',
    exchange_rate: null,
    ...p,
  }
}
function expense(p: Partial<SpendExpense>): SpendExpense {
  return {
    bucket: 'food',
    amount_cents: 5000,
    currency: 'IDR',
    exchange_rate: null,
    ...p,
  }
}

describe('buildTripSpendReport', () => {
  it('returns all zeros for empty input', () => {
    const r = buildTripSpendReport({
      bookings: [],
      expenses: [],
      baseCurrency: 'IDR',
    })
    expect(r.grandTotalBaseCents).toBe(0)
    expect(r.bookingsBaseCents).toBe(0)
    expect(r.expensesBaseCents).toBe(0)
    expect(r.byCategory).toEqual([])
    expect(r.byCurrency).toEqual([])
    expect(r.missingRateCount).toBe(0)
  })

  it('sums base-currency bookings and expenses into the grand total', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: 30000 })],
      expenses: [expense({ amount_cents: 20000 })],
      baseCurrency: 'IDR',
    })
    expect(r.bookingsBaseCents).toBe(30000)
    expect(r.expensesBaseCents).toBe(20000)
    expect(r.grandTotalBaseCents).toBe(50000)
    expect(r.missingRateCount).toBe(0)
  })

  it('converts a foreign-currency line using its exchange_rate (rounded)', () => {
    const r = buildTripSpendReport({
      bookings: [],
      // 100 SGD (amount_cents 10000) * rate 116.5 = 1,165,000 cents
      expenses: [
        expense({ amount_cents: 10000, currency: 'SGD', exchange_rate: 116.5 }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.expensesBaseCents).toBe(1165000)
    expect(r.grandTotalBaseCents).toBe(1165000)
  })

  it('rounds fractional cents when converting foreign currency', () => {
    const r = buildTripSpendReport({
      bookings: [],
      // 3 SGD cents * 116.5 = 349.5 → rounds to 350
      expenses: [
        expense({ amount_cents: 3, currency: 'SGD', exchange_rate: 116.5 }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.expensesBaseCents).toBe(350)
  })

  it('excludes a foreign line without a rate but still counts its currency', () => {
    const r = buildTripSpendReport({
      bookings: [],
      expenses: [
        expense({ amount_cents: 10000, currency: 'SGD', exchange_rate: null }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.grandTotalBaseCents).toBe(0)
    expect(r.missingRateCount).toBe(1)
    expect(r.byCurrency).toEqual([{ currency: 'SGD', cents: 10000 }])
  })

  it('skips a booking with a null amount entirely', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: null, currency: 'SGD' })],
      expenses: [],
      baseCurrency: 'IDR',
    })
    expect(r.grandTotalBaseCents).toBe(0)
    expect(r.missingRateCount).toBe(0)
    expect(r.byCurrency).toEqual([])
  })

  it('merges booking type and expense category into the same bucket', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ bucket: 'lodging', amount_cents: 30000 })],
      expenses: [expense({ bucket: 'lodging', amount_cents: 20000 })],
      baseCurrency: 'IDR',
    })
    expect(r.byCategory).toEqual([{ bucket: 'lodging', baseCents: 50000 }])
  })

  it('converts a foreign-currency booking using its exchange_rate', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: 10000, currency: 'SGD', exchange_rate: 2 })],
      expenses: [],
      baseCurrency: 'IDR',
    })
    expect(r.bookingsBaseCents).toBe(20000)
    expect(r.grandTotalBaseCents).toBe(20000)
  })

  it('aggregates per currency with the base currency listed first', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: 30000, currency: 'IDR' })],
      expenses: [
        expense({ amount_cents: 10000, currency: 'SGD', exchange_rate: 100 }),
        expense({ amount_cents: 5000, currency: 'SGD', exchange_rate: 100 }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.byCurrency).toEqual([
      { currency: 'IDR', cents: 30000 },
      { currency: 'SGD', cents: 15000 },
    ])
  })
})
