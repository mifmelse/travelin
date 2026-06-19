import { describe, it, expect } from 'vitest'
import {
  createBookingSchema,
  updateBookingSchema,
} from '@/services/booking.service'

describe('createBookingSchema', () => {
  it('accepts minimal valid input (type + currency)', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'IDR',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full valid input', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      provider: 'Booking.com',
      confirmation_code: 'ABC123',
      booked_at: '2026-06-01T10:00',
      amount: '1500000',
      currency: 'SGD',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing type', () => {
    const result = createBookingSchema.safeParse({ currency: 'IDR' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createBookingSchema.safeParse({
      type: 'hotel', // not a valid booking_type (should be "lodging")
      currency: 'IDR',
    })
    expect(result.success).toBe(false)
  })

  it.each(['flight', 'lodging', 'activity', 'transport', 'other'] as const)(
    'accepts type: %s',
    (type) => {
      const result = createBookingSchema.safeParse({ type, currency: 'IDR' })
      expect(result.success).toBe(true)
    }
  )

  it('rejects invalid currency', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'EUR', // not in supported list
    })
    expect(result.success).toBe(false)
  })

  it.each(['IDR', 'SGD', 'MYR', 'THB', 'VND', 'PHP', 'USD'] as const)(
    'accepts currency: %s',
    (currency) => {
      const result = createBookingSchema.safeParse({ type: 'flight', currency })
      expect(result.success).toBe(true)
    }
  )

  it('accepts empty strings for optional text fields', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'IDR',
      provider: '',
      confirmation_code: '',
      booked_at: '',
      amount: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a whole-number amount', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'IDR',
      amount: '150000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a decimal amount', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'IDR',
      amount: '150.50',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.amount?.[0]).toContain('angka bulat')
    }
  })

  it('rejects a non-numeric amount', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'IDR',
      amount: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('rejects provider longer than 200 characters', () => {
    const result = createBookingSchema.safeParse({
      type: 'flight',
      currency: 'IDR',
      provider: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('accepts a decimal exchange_rate', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      currency: 'SGD',
      exchange_rate: '11650.5',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty exchange_rate', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      currency: 'IDR',
      exchange_rate: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-numeric exchange_rate', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      currency: 'SGD',
      exchange_rate: 'abc',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateBookingSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateBookingSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update (type only)', () => {
    const result = updateBookingSchema.safeParse({ type: 'transport' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update (amount only)', () => {
    const result = updateBookingSchema.safeParse({ amount: '250000' })
    expect(result.success).toBe(true)
  })

  it('still validates amount format on partial update', () => {
    const result = updateBookingSchema.safeParse({ amount: '12.5' })
    expect(result.success).toBe(false)
  })

  it('still validates currency enum on partial update', () => {
    const result = updateBookingSchema.safeParse({ currency: 'EUR' })
    expect(result.success).toBe(false)
  })
})
