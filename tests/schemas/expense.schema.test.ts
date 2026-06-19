import { describe, it, expect } from 'vitest'
import {
  createExpenseSchema,
  updateExpenseSchema,
} from '@/services/expense.service'

const PROFILE_A = '11111111-1111-4111-8111-111111111111'
const PROFILE_B = '22222222-2222-4222-8222-222222222222'

const validBase = {
  category: 'food',
  amount: '100',
  currency: 'IDR',
  paid_by: PROFILE_A,
}

describe('createExpenseSchema', () => {
  it('accepts a minimal valid expense without splits', () => {
    const result = createExpenseSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rejects a non-integer amount', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      amount: '10.50',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid category', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      category: 'gambling',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported currency', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      currency: 'EUR',
    })
    expect(result.success).toBe(false)
  })

  it('accepts splits that sum exactly to the amount (in cents)', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      amount: '100', // 10000 cents
      splits: [
        { profile_id: PROFILE_A, share_cents: 5000 },
        { profile_id: PROFILE_B, share_cents: 5000 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects splits that do not sum to the amount', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      amount: '100', // 10000 cents
      splits: [
        { profile_id: PROFILE_A, share_cents: 5000 },
        { profile_id: PROFILE_B, share_cents: 4000 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects splits with a non-uuid profile id', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      splits: [{ profile_id: 'not-a-uuid', share_cents: 10000 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts an optional decimal exchange_rate', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      currency: 'THB',
      exchange_rate: '450.5',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-numeric exchange_rate', () => {
    const result = createExpenseSchema.safeParse({
      ...validBase,
      exchange_rate: 'abc',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateExpenseSchema', () => {
  it('accepts a partial update (category only)', () => {
    const result = updateExpenseSchema.safeParse({ category: 'transport' })
    expect(result.success).toBe(true)
  })

  it('still enforces the split-sum refinement', () => {
    const result = updateExpenseSchema.safeParse({
      amount: '100',
      splits: [{ profile_id: PROFILE_A, share_cents: 9000 }],
    })
    expect(result.success).toBe(false)
  })
})
