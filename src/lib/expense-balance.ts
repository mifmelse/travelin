// Pure money math for the expense tracker — no Supabase, no React, so it can be
// unit-tested in isolation. All amounts are integer cents (see lib/format).
//
// Model: an expense is paid by one person (`paid_by`) and divided into splits
// (one `share_cents` per participant). A participant who is NOT the payer owes
// the payer their share, until that split is marked `settled`. Debts are kept
// per currency — we never sum across currencies here (the trip's base-currency
// grand total is computed separately, only for expenses that carry a rate).

export type SplitForBalance = {
  profile_id: string
  share_cents: number
  settled: boolean
}

export type ExpenseForBalance = {
  paid_by: string
  currency: string
  splits: SplitForBalance[]
}

/** A debtor owes a creditor an amount in a given currency. */
export type Debt = {
  from: string
  to: string
  currency: string
  amount_cents: number
}

/** Net position of a profile in a given currency. Positive = others owe them. */
export type NetBalance = {
  profile_id: string
  currency: string
  net_cents: number
}

export type BalanceResult = {
  debts: Debt[]
  net: NetBalance[]
}

/**
 * Aggregate unsettled splits into pairwise debts and per-profile net balances.
 * Settled splits and a payer's own share are ignored.
 */
export function computeBalances(
  expenses: ExpenseForBalance[]
): BalanceResult {
  const debtMap = new Map<string, Debt>()
  const netMap = new Map<string, NetBalance>()

  const bumpNet = (profileId: string, currency: string, delta: number) => {
    const key = `${profileId}|${currency}`
    const existing = netMap.get(key)
    if (existing) {
      existing.net_cents += delta
    } else {
      netMap.set(key, { profile_id: profileId, currency, net_cents: delta })
    }
  }

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.settled) continue
      if (split.profile_id === expense.paid_by) continue
      if (split.share_cents <= 0) continue

      const debtor = split.profile_id
      const creditor = expense.paid_by
      const currency = expense.currency

      const key = `${debtor}|${creditor}|${currency}`
      const existing = debtMap.get(key)
      if (existing) {
        existing.amount_cents += split.share_cents
      } else {
        debtMap.set(key, {
          from: debtor,
          to: creditor,
          currency,
          amount_cents: split.share_cents,
        })
      }

      bumpNet(creditor, currency, split.share_cents)
      bumpNet(debtor, currency, -split.share_cents)
    }
  }

  return {
    debts: [...debtMap.values()],
    net: [...netMap.values()].filter((n) => n.net_cents !== 0),
  }
}

/**
 * Split a whole-unit amount equally across N participants, distributing any
 * remainder one unit at a time to the first participants so the parts always
 * sum exactly to the total. Operates in whole units (not cents).
 */
export function equalShares(amountWhole: number, count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor(amountWhole / count)
  const remainder = amountWhole - base * count
  return Array.from({ length: count }, (_, i) =>
    i < remainder ? base + 1 : base
  )
}
