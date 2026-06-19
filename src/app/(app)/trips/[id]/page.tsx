import { BookOpenText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@/services/trip.service'
import { listBookingsForTrip } from '@/services/booking.service'
import { listExpensesForTrip } from '@/services/expense.service'
import { buildTripSpendReport } from '@/lib/trip-spend'
import { TripSpendReport } from '@/components/features/trip/trip-spend-report'
import { EmptyState } from '@/components/ui/empty-state'

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [trip, bookings, expenses] = await Promise.all([
    getTripById(supabase, id, user.id),
    listBookingsForTrip(supabase, id, user.id),
    listExpensesForTrip(supabase, id, user.id),
  ])

  const baseCurrency = trip?.base_currency ?? 'IDR'

  if (bookings.length === 0 && expenses.length === 0) {
    return (
      <EmptyState
        icon={BookOpenText}
        title="Overview trip"
        description="Tambahkan booking atau expense untuk melihat ringkasan pengeluaran trip di sini."
      />
    )
  }

  const report = buildTripSpendReport({
    bookings: bookings.map((b) => ({
      bucket: b.type,
      amount_cents: b.amount_cents,
      currency: b.currency ?? baseCurrency,
      exchange_rate: b.exchange_rate,
    })),
    expenses: expenses.map((e) => ({
      bucket: e.category,
      amount_cents: e.amount_cents,
      currency: e.currency,
      exchange_rate: e.exchange_rate,
    })),
    baseCurrency,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ringkasan pengeluaran</h2>
      <TripSpendReport report={report} baseCurrency={baseCurrency} />
    </div>
  )
}
