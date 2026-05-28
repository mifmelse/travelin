import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { DollarSign } from 'lucide-react'

export default function TripExpensesPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Expenses" />
      <EmptyState
        icon={DollarSign}
        title="Belum ada expense"
        description="Pengeluaran trip lo bakal tercatat di sini, multi-currency."
      />
    </div>
  )
}
