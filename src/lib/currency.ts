// Currencies relevant to Southeast Asia travelers (plus USD), shared by trip
// base-currency selection and the expense tracker. Whole-unit only — the app's
// money model stores integer "cents" (value * 100) and formats with zero
// fraction digits (see formatCurrency / parseAmountToCents in lib/format).
export const CURRENCIES = [
  'IDR',
  'SGD',
  'MYR',
  'THB',
  'VND',
  'PHP',
  'USD',
] as const

export type Currency = (typeof CURRENCIES)[number]
