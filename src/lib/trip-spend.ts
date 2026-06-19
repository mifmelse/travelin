// Unified spend buckets = union of booking types and expense categories.
// Both enums are already subsets of this set, so no lossy mapping is needed.
export type SpendBucket =
  | 'flight'
  | 'lodging'
  | 'transport'
  | 'activity'
  | 'food'
  | 'shopping'
  | 'other'

const BUCKET_ORDER: SpendBucket[] = [
  'flight',
  'lodging',
  'transport',
  'activity',
  'food',
  'shopping',
  'other',
]

// A booking line. `amount_cents` is nullable (a booking may not be priced yet).
export type SpendBooking = {
  bucket: SpendBucket
  amount_cents: number | null
  currency: string
  exchange_rate: number | null
}

// An expense line. `amount_cents` is always present (NOT NULL in the schema).
export type SpendExpense = {
  bucket: SpendBucket
  amount_cents: number
  currency: string
  exchange_rate: number | null
}

export type TripSpendReport = {
  grandTotalBaseCents: number
  bookingsBaseCents: number
  expensesBaseCents: number
  byCategory: { bucket: SpendBucket; baseCents: number }[]
  byCurrency: { currency: string; cents: number }[]
  missingRateCount: number
}

/**
 * Convert a money line to the trip's base currency.
 * - same currency as base → as-is
 * - has a manual exchange_rate → amount * rate (rounded to integer cents)
 * - otherwise → null (cannot convert; excluded from base totals)
 */
function toBaseCents(
  amountCents: number,
  currency: string,
  rate: number | null,
  baseCurrency: string
): number | null {
  if (currency === baseCurrency) return amountCents
  if (rate != null) return Math.round(amountCents * rate)
  return null
}

/**
 * Fold the two non-overlapping spend streams (bookings + expenses) into one
 * report. Bookings and expenses are summed independently — one transaction is
 * expected to live in exactly one stream (no double-count enforcement; D16).
 */
export function buildTripSpendReport({
  bookings,
  expenses,
  baseCurrency,
}: {
  bookings: SpendBooking[]
  expenses: SpendExpense[]
  baseCurrency: string
}): TripSpendReport {
  const byCurrency = new Map<string, number>()
  const byBucket = new Map<SpendBucket, number>()
  let grandTotalBaseCents = 0
  let bookingsBaseCents = 0
  let expensesBaseCents = 0
  let missingRateCount = 0

  const addCurrency = (currency: string, cents: number) => {
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + cents)
  }
  const addBucket = (bucket: SpendBucket, cents: number) => {
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + cents)
  }

  for (const b of bookings) {
    if (b.amount_cents == null) continue // not yet priced; skip entirely
    addCurrency(b.currency, b.amount_cents)
    const base = toBaseCents(
      b.amount_cents,
      b.currency,
      b.exchange_rate,
      baseCurrency
    )
    if (base == null) {
      missingRateCount += 1
      continue
    }
    grandTotalBaseCents += base
    bookingsBaseCents += base
    addBucket(b.bucket, base)
  }

  for (const e of expenses) {
    addCurrency(e.currency, e.amount_cents)
    const base = toBaseCents(
      e.amount_cents,
      e.currency,
      e.exchange_rate,
      baseCurrency
    )
    if (base == null) {
      missingRateCount += 1
      continue
    }
    grandTotalBaseCents += base
    expensesBaseCents += base
    addBucket(e.bucket, base)
  }

  const byCategory = BUCKET_ORDER.filter(
    (bucket) => (byBucket.get(bucket) ?? 0) !== 0
  ).map((bucket) => ({ bucket, baseCents: byBucket.get(bucket) as number }))

  // Base currency first, then the rest alphabetically — deterministic output.
  const byCurrencyList = [...byCurrency.entries()]
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => {
      if (a.currency === b.currency) return 0
      if (a.currency === baseCurrency) return -1
      if (b.currency === baseCurrency) return 1
      return a.currency.localeCompare(b.currency)
    })

  return {
    grandTotalBaseCents,
    bookingsBaseCents,
    expensesBaseCents,
    byCategory,
    byCurrency: byCurrencyList,
    missingRateCount,
  }
}
