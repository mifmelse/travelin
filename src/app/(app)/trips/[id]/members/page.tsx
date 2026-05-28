import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Users } from 'lucide-react'

export default function TripMembersPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Members" />
      <EmptyState
        icon={Users}
        title="Cuma lo sendiri di trip ini"
        description="Invitation flow buat ajak teman/pasangan join trip lagi dirancang."
      />
    </div>
  )
}
