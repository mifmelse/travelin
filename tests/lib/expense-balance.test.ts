import { describe, it, expect } from 'vitest'
import { computeBalances, equalShares } from '@/lib/expense-balance'

const A = 'aaaa'
const B = 'bbbb'
const C = 'cccc'

describe('equalShares', () => {
  it('splits evenly when divisible', () => {
    expect(equalShares(9000, 3)).toEqual([3000, 3000, 3000])
  })

  it('distributes the remainder one unit at a time to the first members', () => {
    expect(equalShares(10000, 3)).toEqual([3334, 3333, 3333])
  })

  it('always sums back to the original amount', () => {
    const parts = equalShares(100, 7)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('returns an empty array for zero participants', () => {
    expect(equalShares(100, 0)).toEqual([])
  })
})

describe('computeBalances', () => {
  it('returns no debts when there are no splits', () => {
    const { debts, net } = computeBalances([
      { paid_by: A, currency: 'IDR', splits: [] },
    ])
    expect(debts).toEqual([])
    expect(net).toEqual([])
  })

  it('ignores the payer’s own share', () => {
    const { debts } = computeBalances([
      {
        paid_by: A,
        currency: 'IDR',
        splits: [
          { profile_id: A, share_cents: 5000, settled: false },
          { profile_id: B, share_cents: 5000, settled: false },
        ],
      },
    ])
    expect(debts).toEqual([
      { from: B, to: A, currency: 'IDR', amount_cents: 5000 },
    ])
  })

  it('excludes settled splits', () => {
    const { debts, net } = computeBalances([
      {
        paid_by: A,
        currency: 'IDR',
        splits: [{ profile_id: B, share_cents: 5000, settled: true }],
      },
    ])
    expect(debts).toEqual([])
    expect(net).toEqual([])
  })

  it('aggregates repeated debts between the same pair and currency', () => {
    const { debts } = computeBalances([
      {
        paid_by: A,
        currency: 'IDR',
        splits: [{ profile_id: B, share_cents: 3000, settled: false }],
      },
      {
        paid_by: A,
        currency: 'IDR',
        splits: [{ profile_id: B, share_cents: 2000, settled: false }],
      },
    ])
    expect(debts).toEqual([
      { from: B, to: A, currency: 'IDR', amount_cents: 5000 },
    ])
  })

  it('keeps debts in different currencies separate', () => {
    const { debts } = computeBalances([
      {
        paid_by: A,
        currency: 'IDR',
        splits: [{ profile_id: B, share_cents: 3000, settled: false }],
      },
      {
        paid_by: A,
        currency: 'THB',
        splits: [{ profile_id: B, share_cents: 2000, settled: false }],
      },
    ])
    expect(debts).toHaveLength(2)
    expect(debts.find((d) => d.currency === 'THB')?.amount_cents).toBe(2000)
  })

  it('computes signed net balances per profile', () => {
    const { net } = computeBalances([
      {
        paid_by: A,
        currency: 'IDR',
        splits: [
          { profile_id: B, share_cents: 4000, settled: false },
          { profile_id: C, share_cents: 4000, settled: false },
        ],
      },
    ])
    const byId = Object.fromEntries(net.map((n) => [n.profile_id, n.net_cents]))
    expect(byId[A]).toBe(8000)
    expect(byId[B]).toBe(-4000)
    expect(byId[C]).toBe(-4000)
  })
})
