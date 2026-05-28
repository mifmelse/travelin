import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { ClipboardList } from 'lucide-react'

export default function TripBookingsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Bookings" />
      <EmptyState
        icon={ClipboardList}
        title="Belum ada booking"
        description="Catatan booking dari Traveloka, Booking.com, dst. akan muncul di sini."
      />
    </div>
  )
}
