import { formatCurrency } from '@/lib/format'
import type { Expense } from './edit-expense-dialog'

/**
 * Per-currency subtotals plus a base-currency grand total. Expenses already in
 * the base currency count at rate 1; other currencies only contribute to the
 * grand total when they carry a manual exchange_rate. Anything without a rate
 * is shown in its own currency line and flagged as excluded from the total.
 */
export function ExpenseTotals({
  expenses,
  baseCurrency,
}: {
  expenses: Pick<Expense, 'amount_cents' | 'currency' | 'exchange_rate'>[]
  baseCurrency: string
}) {
  if (expenses.length === 0) return null

  const byCurrency = new Map<string, number>()
  let grandTotalCents = 0
  let missingRate = 0

  for (const e of expenses) {
    byCurrency.set(
      e.currency,
      (byCurrency.get(e.currency) ?? 0) + e.amount_cents
    )

    if (e.currency === baseCurrency) {
      grandTotalCents += e.amount_cents
    } else if (e.exchange_rate != null) {
      grandTotalCents += Math.round(e.amount_cents * e.exchange_rate)
    } else {
      missingRate += 1
    }
  }

  const currencies = [...byCurrency.entries()]

  return (
    <div className="rounded-lg border border-input p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">
          Total ({baseCurrency})
        </span>
        <span className="text-lg font-semibold">
          {formatCurrency(grandTotalCents, baseCurrency)}
        </span>
      </div>

      {currencies.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {currencies.map(([currency, cents]) => (
            <span key={currency}>
              {formatCurrency(cents, currency)}
            </span>
          ))}
        </div>
      )}

      {missingRate > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {missingRate} expense tanpa kurs belum masuk total {baseCurrency}.
        </p>
      )}
    </div>
  )
}
