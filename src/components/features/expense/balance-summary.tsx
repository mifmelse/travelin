'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { computeBalances } from '@/lib/expense-balance'
import type { SplitMember } from './split-editor'
import type { Expense } from './edit-expense-dialog'
import { toggleSettleAction } from '@/app/(app)/trips/[id]/expenses/actions'

type UnsettledDebt = {
  splitId: string
  debtor: string
  creditor: string
  currency: string
  amountCents: number
}

export function BalanceSummary({
  tripId,
  expenses,
  members,
}: {
  tripId: string
  expenses: Expense[]
  members: SplitMember[]
}) {
  const router = useRouter()
  const [settlingId, setSettlingId] = useState<string | null>(null)

  const nameOf = (id: string) =>
    members.find((m) => m.profile_id === id)?.display_name ?? 'Traveler'

  const { net } = computeBalances(
    expenses.map((e) => ({
      paid_by: e.paid_by,
      currency: e.currency,
      splits: e.expense_splits.map((s) => ({
        profile_id: s.profile_id,
        share_cents: s.share_cents,
        settled: s.settled,
      })),
    }))
  )

  // Individual unsettled debts (each maps to one split row we can settle).
  const debts: UnsettledDebt[] = []
  for (const e of expenses) {
    for (const s of e.expense_splits) {
      if (s.settled || s.profile_id === e.paid_by || s.share_cents <= 0) continue
      debts.push({
        splitId: s.id,
        debtor: s.profile_id,
        creditor: e.paid_by,
        currency: e.currency,
        amountCents: s.share_cents,
      })
    }
  }

  if (net.length === 0 && debts.length === 0) return null

  async function settle(splitId: string) {
    setSettlingId(splitId)
    const result = await toggleSettleAction(tripId, splitId, true)
    if (result?.error) {
      alert(`Gagal: ${result.error}`)
      setSettlingId(null)
      return
    }
    setSettlingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-3 rounded-lg border border-input p-4">
      <h3 className="text-sm font-semibold">Saldo & utang</h3>

      {net.length > 0 && (
        <ul className="space-y-1 text-sm">
          {net.map((n) => (
            <li
              key={`${n.profile_id}-${n.currency}`}
              className="flex justify-between"
            >
              <span>{nameOf(n.profile_id)}</span>
              <span
                className={
                  n.net_cents >= 0 ? 'text-foreground' : 'text-destructive'
                }
              >
                {n.net_cents >= 0 ? 'menerima ' : 'berutang '}
                {formatCurrency(Math.abs(n.net_cents), n.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {debts.length > 0 && (
        <div className="space-y-2 border-t border-input pt-3">
          {debts.map((d) => (
            <div
              key={d.splitId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">
                {nameOf(d.debtor)} → {nameOf(d.creditor)}:{' '}
                {formatCurrency(d.amountCents, d.currency)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={settlingId === d.splitId}
                onClick={() => settle(d.splitId)}
              >
                {settlingId === d.splitId ? '...' : 'Lunaskan'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
