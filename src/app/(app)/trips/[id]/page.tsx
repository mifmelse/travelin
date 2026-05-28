import { EmptyState } from '@/components/ui/empty-state'
import { BookOpenText } from 'lucide-react'

export default function TripOverviewPage() {
  return (
    <EmptyState
      icon={BookOpenText}
      title="Overview trip"
      description="Ringkasan trip (highlights, statistik, link cepat) bakal muncul di sini setelah fitur Itinerary, Bookings, dan Expenses jalan."
    />
  )
}
