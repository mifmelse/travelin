import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Calendar } from 'lucide-react'

export default function TripItineraryPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Itinerary" />
      <EmptyState
        icon={Calendar}
        title="Belum ada itinerary"
        description="Itinerary CRUD masih dalam perjalanan. Stay tuned, ya."
      />
    </div>
  )
}
