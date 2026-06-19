import {
  Plane,
  BedDouble,
  Ticket,
  Car,
  Utensils,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import type { IconTone } from '@/components/ui/icon-tile'

export type ItineraryType =
  | 'flight'
  | 'lodging'
  | 'activity'
  | 'transport'
  | 'meal'
  | 'note'

export const ITINERARY_TYPES: ReadonlyArray<{
  value: ItineraryType
  label: string
  icon: LucideIcon
  tone: IconTone
}> = [
  { value: 'activity', label: 'Aktivitas', icon: Ticket, tone: 'primary' },
  { value: 'flight', label: 'Penerbangan', icon: Plane, tone: 'accent' },
  { value: 'lodging', label: 'Penginapan', icon: BedDouble, tone: 'accent' },
  { value: 'transport', label: 'Transport', icon: Car, tone: 'primary' },
  { value: 'meal', label: 'Makan', icon: Utensils, tone: 'primary' },
  { value: 'note', label: 'Catatan', icon: StickyNote, tone: 'muted' },
]

const META = Object.fromEntries(
  ITINERARY_TYPES.map((t) => [t.value, t])
) as Record<ItineraryType, (typeof ITINERARY_TYPES)[number]>

export function itineraryTypeMeta(type: ItineraryType) {
  return META[type]
}
