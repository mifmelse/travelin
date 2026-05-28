'use client'

import { MapPin, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { TripActionsMenu } from './trip-actions-menu'
import { formatTripDateRange } from '@/lib/format'
import { useTrip } from './trip-context'

export function TripSummaryBanner() {
  const trip = useTrip()
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">
            {trip.title}
          </h1>
          <StatusBadge status={trip.status} />
        </div>
        <TripActionsMenu trip={trip} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {trip.destination ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{trip.destination}</span>
          </div>
        ) : null}
        {(trip.start_date || trip.end_date) && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
