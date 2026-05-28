'use client'

import { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

export type TripRow = Database['public']['Tables']['trips']['Row']

type TripContextValue = {
  trip: TripRow
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({
  trip,
  children,
}: {
  trip: TripRow
  children: React.ReactNode
}) {
  return (
    <TripContext.Provider value={{ trip }}>{children}</TripContext.Provider>
  )
}

export function useTrip(): TripRow {
  const ctx = useContext(TripContext)
  if (!ctx) {
    throw new Error('useTrip must be used within <TripProvider>')
  }
  return ctx.trip
}
