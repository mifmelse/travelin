import { format, parseISO } from 'date-fns'
import { Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listItineraryForTrip } from '@/services/itinerary.service'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { ItemRow } from '@/components/ui/item-row'
import { NewItineraryDialog } from '@/components/features/itinerary/new-itinerary-dialog'
import { ItineraryActionsMenu } from '@/components/features/itinerary/itinerary-actions-menu'
import {
  itineraryTypeMeta,
  type ItineraryType,
} from '@/components/features/itinerary/itinerary-meta'
import type { ItineraryItem } from '@/components/features/itinerary/edit-itinerary-dialog'

const UNSCHEDULED = 'unscheduled'

// Wall-clock time portion ("14:30") — sliced to avoid timezone drift.
function timeOf(value: string | null): string | null {
  return value ? value.slice(11, 16) : null
}

function timeLabel(startAt: string | null, endAt: string | null): string | undefined {
  const start = timeOf(startAt)
  const end = timeOf(endAt)
  if (start && end) return `${start}–${end}`
  if (start) return start
  return undefined
}

function groupByDay(items: ItineraryItem[]): [string, ItineraryItem[]][] {
  const groups = new Map<string, ItineraryItem[]>()
  for (const item of items) {
    const key = item.start_at ? item.start_at.slice(0, 10) : UNSCHEDULED
    const bucket = groups.get(key)
    if (bucket) bucket.push(item)
    else groups.set(key, [item])
  }
  return Array.from(groups.entries())
}

function dayHeading(key: string): string {
  if (key === UNSCHEDULED) return 'Belum dijadwalkan'
  return format(parseISO(key), 'EEEE, d MMM yyyy')
}

export default async function TripItineraryPage({
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

  const items = (await listItineraryForTrip(
    supabase,
    id,
    user.id
  )) as ItineraryItem[]

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Itinerary"
        action={<NewItineraryDialog tripId={id} />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Belum ada itinerary"
          description="Tambah aktivitas, penerbangan, atau penginapan buat nyusun rencana harian lo."
        />
      ) : (
        <div className="space-y-6">
          {groupByDay(items).map(([key, dayItems]) => (
            <section key={key} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {dayHeading(key)}
              </h3>
              <div className="space-y-2">
                {dayItems.map((item) => {
                  const meta = itineraryTypeMeta(item.type as ItineraryType)
                  return (
                    <ItemRow
                      key={item.id}
                      icon={meta.icon}
                      iconTone={meta.tone}
                      time={timeLabel(item.start_at, item.end_at)}
                      title={item.title}
                      subtitle={item.location_name ?? undefined}
                      actions={<ItineraryActionsMenu item={item} />}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
