import { describe, it, expect } from 'vitest'
import {
  createTripSchema,
  updateTripSchema,
} from '@/services/trip.service'

describe('createTripSchema', () => {
  it('accepts minimal valid input (title only)', () => {
    const result = createTripSchema.safeParse({
      title: 'Bali Trip',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full valid input', () => {
    const result = createTripSchema.safeParse({
      title: 'Bali Trip',
      description: 'Liburan tahun baru',
      destination: 'Bali',
      start_date: '2026-01-01',
      end_date: '2026-01-07',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const result = createTripSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createTripSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.title?.[0]).toContain('wajib diisi')
    }
  })

  it('rejects title longer than 100 characters', () => {
    const result = createTripSchema.safeParse({
      title: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts title exactly 100 characters', () => {
    const result = createTripSchema.safeParse({
      title: 'a'.repeat(100),
    })
    expect(result.success).toBe(true)
  })

  it('rejects end_date before start_date', () => {
    const result = createTripSchema.safeParse({
      title: 'Trip',
      start_date: '2026-05-10',
      end_date: '2026-05-05',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.end_date?.[0]).toContain('Tanggal selesai')
    }
  })

  it('accepts end_date equal to start_date (same-day trip)', () => {
    const result = createTripSchema.safeParse({
      title: 'Day Trip',
      start_date: '2026-05-10',
      end_date: '2026-05-10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for optional fields', () => {
    const result = createTripSchema.safeParse({
      title: 'Trip',
      description: '',
      destination: '',
      start_date: '',
      end_date: '',
    })
    expect(result.success).toBe(true)
  })

  it('skips date range refinement when one date is missing', () => {
    const result = createTripSchema.safeParse({
      title: 'Trip',
      start_date: '2026-05-10',
      // end_date intentionally missing
    })
    expect(result.success).toBe(true)
  })
})

describe('updateTripSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateTripSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update (title only)', () => {
    const result = updateTripSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBe(true)
  })

  it('accepts status field', () => {
    const result = updateTripSchema.safeParse({ status: 'ongoing' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = updateTripSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('still validates date range refinement on partial update', () => {
    const result = updateTripSchema.safeParse({
      start_date: '2026-05-10',
      end_date: '2026-05-05',
    })
    expect(result.success).toBe(false)
  })

  it.each(['planning', 'ongoing', 'completed', 'archived'] as const)(
    'accepts status: %s',
    (status) => {
      const result = updateTripSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  )
})
