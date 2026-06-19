'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenText,
  Calendar as CalendarIcon,
  ClipboardList,
  DollarSign,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TripRailProps = {
  tripId: string
}

const ITEMS = [
  { segment: '', icon: BookOpenText, label: 'Overview' },
  { segment: '/itinerary', icon: CalendarIcon, label: 'Itinerary' },
  { segment: '/bookings', icon: ClipboardList, label: 'Bookings' },
  { segment: '/expenses', icon: DollarSign, label: 'Expenses' },
  { segment: '/members', icon: Users, label: 'Members' },
] as const

export function TripRail({ tripId }: TripRailProps) {
  const pathname = usePathname()
  const base = `/trips/${tripId}`

  function isActive(segment: string) {
    const href = `${base}${segment}`
    if (segment === '') return pathname === base
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden md:flex w-44 shrink-0 flex-col gap-0.5 rounded-xl border border-border bg-card p-2 self-start sticky top-24">
        {ITEMS.map(({ segment, icon: Icon, label }) => {
          const active = isActive(segment)
          return (
            <Link
              key={segment || 'overview'}
              href={`${base}${segment}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: horizontal scroll tabs */}
      <nav className="md:hidden -mx-4 px-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(({ segment, icon: Icon, label }) => {
          const active = isActive(segment)
          return (
            <Link
              key={segment || 'overview'}
              href={`${base}${segment}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                active
                  ? 'border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary font-medium'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
