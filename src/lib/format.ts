import { format, parseISO } from 'date-fns'

export function formatTripDateRange(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate && !endDate) return 'Tanggal belum diisi'
  if (startDate && !endDate)
    return `Mulai ${format(parseISO(startDate), 'd MMM yyyy')}`
  if (!startDate && endDate)
    return `Sampai ${format(parseISO(endDate), 'd MMM yyyy')}`

  const start = parseISO(startDate!)
  const end = parseISO(endDate!)

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`
    }
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
  }

  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
}

export function formatCurrency(amountCents: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100)
}

/**
 * Parse a whole-unit amount string (e.g. "150000") into integer cents (15000000).
 * Returns null for empty input. Throws on non-integer / negative input so callers
 * surface a loud error instead of silently storing bad money values.
 */
export function parseAmountToCents(value: string | null | undefined): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('Jumlah harus berupa angka bulat tanpa desimal')
  }
  return Number(trimmed) * 100
}
