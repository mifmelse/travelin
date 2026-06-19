import {
  Plane,
  BedDouble,
  Ticket,
  Car,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { IconTone } from '@/components/ui/icon-tile'

export type BookingType = 'flight' | 'lodging' | 'activity' | 'transport' | 'other'

export const BOOKING_TYPES: ReadonlyArray<{
  value: BookingType
  label: string
  icon: LucideIcon
  tone: IconTone
}> = [
  { value: 'flight', label: 'Penerbangan', icon: Plane, tone: 'accent' },
  { value: 'lodging', label: 'Penginapan', icon: BedDouble, tone: 'accent' },
  { value: 'activity', label: 'Aktivitas', icon: Ticket, tone: 'primary' },
  { value: 'transport', label: 'Transport', icon: Car, tone: 'primary' },
  { value: 'other', label: 'Lainnya', icon: Receipt, tone: 'muted' },
]

// Currencies relevant to Southeast Asia travelers (plus USD).
export const BOOKING_CURRENCIES = [
  'IDR',
  'SGD',
  'MYR',
  'THB',
  'VND',
  'PHP',
  'USD',
] as const

export type BookingCurrency = (typeof BOOKING_CURRENCIES)[number]

const META = Object.fromEntries(
  BOOKING_TYPES.map((t) => [t.value, t])
) as Record<BookingType, (typeof BOOKING_TYPES)[number]>

export function bookingTypeMeta(type: BookingType) {
  return META[type]
}
