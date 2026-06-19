import Link from 'next/link'
import { MapPin, Calendar } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatTripDateRange } from '@/lib/format'

type TripCardProps = {
  trip: {
    id: string
    title: string
    description: string | null
    destination: string | null
    start_date: string | null
    end_date: string | null
    status: 'planning' | 'ongoing' | 'completed' | 'archived'
  }
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <Link href={`/trips/${trip.id}`} className="block">
      <Card className="transition-colors hover:bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))]">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{trip.title}</CardTitle>
            <StatusBadge status={trip.status} className="shrink-0" />
          </div>
          {trip.description && (
            <CardDescription className="line-clamp-2">
              {trip.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {trip.destination && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{trip.destination}</span>
            </div>
          )}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
