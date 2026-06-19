import { Breadcrumb } from '@/components/ui/breadcrumb'
import { TripSummaryBanner } from '@/components/features/trip/trip-summary-banner'
import { TripRail } from '@/components/shell/trip-rail'

type TripShellProps = {
  tripId: string
  tripTitle: string
  children: React.ReactNode
}

export function TripShell({ tripId, tripTitle, children }: TripShellProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: 'Trips', href: '/dashboard' },
          { label: tripTitle },
        ]}
        className="hidden md:flex"
      />
      <TripSummaryBanner />
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <TripRail tripId={tripId} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
