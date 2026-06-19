import { formatCurrency } from '@/lib/format'
import type { SpendBucket, TripSpendReport } from '@/lib/trip-spend'

const BUCKET_LABEL: Record<SpendBucket, string> = {
  flight: 'Penerbangan',
  lodging: 'Penginapan',
  transport: 'Transport',
  activity: 'Aktivitas',
  food: 'Makan',
  shopping: 'Belanja',
  other: 'Lainnya',
}

/**
 * Trip-level spending: a base-currency grand total split into the two
 * non-overlapping streams (bookings + expenses), a per-category breakdown, and
 * an exact per-currency breakdown. Lines without a usable rate are flagged.
 */
export function TripSpendReport({
  report,
  baseCurrency,
}: {
  report: TripSpendReport
  baseCurrency: string
}) {
  const {
    grandTotalBaseCents,
    bookingsBaseCents,
    expensesBaseCents,
    byCategory,
    byCurrency,
    missingRateCount,
  } = report

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-input p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            Total pengeluaran ({baseCurrency})
          </span>
          <span className="text-2xl font-semibold">
            {formatCurrency(grandTotalBaseCents, baseCurrency)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-muted-foreground">Bookings</div>
            <div className="font-medium">
              {formatCurrency(bookingsBaseCents, baseCurrency)}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-muted-foreground">Expenses</div>
            <div className="font-medium">
              {formatCurrency(expensesBaseCents, baseCurrency)}
            </div>
          </div>
        </div>

        {missingRateCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {missingRateCount} item tanpa kurs belum masuk total {baseCurrency}.
          </p>
        )}
      </div>

      {byCategory.length > 0 && (
        <div className="rounded-lg border border-input p-4">
          <h3 className="text-sm font-medium">Per kategori</h3>
          <dl className="mt-2 space-y-1 text-sm">
            {byCategory.map(({ bucket, baseCents }) => (
              <div key={bucket} className="flex justify-between">
                <dt className="text-muted-foreground">{BUCKET_LABEL[bucket]}</dt>
                <dd>{formatCurrency(baseCents, baseCurrency)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {byCurrency.length > 1 && (
        <div className="rounded-lg border border-input p-4">
          <h3 className="text-sm font-medium">Per mata uang</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {byCurrency.map(({ currency, cents }) => (
              <span key={currency}>{formatCurrency(cents, currency)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
