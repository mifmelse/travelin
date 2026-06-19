import {
  UtensilsCrossed,
  Car,
  BedDouble,
  Ticket,
  ShoppingBag,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { IconTone } from '@/components/ui/icon-tile'

// Mirrors the `expense_category` enum in the database (do not reorder casually —
// values must match the enum exactly).
export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'lodging'
  | 'activity'
  | 'shopping'
  | 'other'

export const EXPENSE_CATEGORIES: ReadonlyArray<{
  value: ExpenseCategory
  label: string
  icon: LucideIcon
  tone: IconTone
}> = [
  { value: 'food', label: 'Makan', icon: UtensilsCrossed, tone: 'primary' },
  { value: 'transport', label: 'Transport', icon: Car, tone: 'primary' },
  { value: 'lodging', label: 'Penginapan', icon: BedDouble, tone: 'accent' },
  { value: 'activity', label: 'Aktivitas', icon: Ticket, tone: 'accent' },
  { value: 'shopping', label: 'Belanja', icon: ShoppingBag, tone: 'muted' },
  { value: 'other', label: 'Lainnya', icon: Receipt, tone: 'muted' },
]

const META = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c])
) as Record<ExpenseCategory, (typeof EXPENSE_CATEGORIES)[number]>

export function expenseCategoryMeta(category: ExpenseCategory) {
  return META[category]
}
