# Trip Spend Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trip-level spending report on the Overview page that combines booking costs and expense costs into one base-currency picture with per-category and per-currency breakdowns.

**Architecture:** A pure reporting function (`src/lib/trip-spend.ts`) folds two non-overlapping money streams (bookings + expenses) into one report, reusing the manual per-row FX model (D15). Bookings gain an optional `exchange_rate` column mirroring `expenses`. The Overview Server Component fetches both lists via the service layer and renders a presentational report component.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript strict, Supabase, Zod v4, Vitest, Tailwind 4.

> **Repo rules (AGENTS.md):** Per §9, **get the owner's explicit approval before every commit and before `supabase db push`** — the commit/push steps below give the exact command to run once approved, not permission to run it unattended. Commit messages use conventional format with **no AI attribution trailer**. Verify with `npx tsc --noEmit` + `npm run test` + `npm run lint` — **never `npm run build`** while dev may be running (§8).

---

## File structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/trip-spend.ts` | Pure report builder + types (no DB/UI deps) |
| Create | `tests/lib/trip-spend.test.ts` | Unit tests for the report builder |
| Create | `supabase/migrations/<ts>_booking_exchange_rate.sql` | Add `bookings.exchange_rate` |
| Modify | `src/types/database.ts` | Regenerated via `npm run db:types` |
| Modify | `src/services/booking.service.ts` | Schema + create/update store rate; list selects it |
| Modify | `tests/schemas/booking.schema.test.ts` | Cover `exchange_rate` validation |
| Modify | `src/app/(app)/trips/[id]/bookings/actions.ts` | Parse `exchange_rate` from FormData |
| Modify | `src/components/features/booking/new-booking-dialog.tsx` | Optional rate field |
| Modify | `src/components/features/booking/edit-booking-dialog.tsx` | Optional rate field |
| Create | `src/components/features/trip/trip-spend-report.tsx` | Presentational report |
| Modify | `src/app/(app)/trips/[id]/page.tsx` | Fetch + render report on Overview |
| Modify | `AGENTS.md` | §4 bookings schema + decision D16 |

---

## Task 1: Pure report builder (`trip-spend.ts`) — TDD

No DB or type-gen dependency, so this goes first.

**Files:**
- Create: `src/lib/trip-spend.ts`
- Test: `tests/lib/trip-spend.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/trip-spend.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  buildTripSpendReport,
  type SpendBooking,
  type SpendExpense,
} from '@/lib/trip-spend'

// Helpers keep each test focused on the field under test.
function booking(p: Partial<SpendBooking>): SpendBooking {
  return {
    bucket: 'lodging',
    amount_cents: 10000,
    currency: 'IDR',
    exchange_rate: null,
    ...p,
  }
}
function expense(p: Partial<SpendExpense>): SpendExpense {
  return {
    bucket: 'food',
    amount_cents: 5000,
    currency: 'IDR',
    exchange_rate: null,
    ...p,
  }
}

describe('buildTripSpendReport', () => {
  it('returns all zeros for empty input', () => {
    const r = buildTripSpendReport({
      bookings: [],
      expenses: [],
      baseCurrency: 'IDR',
    })
    expect(r.grandTotalBaseCents).toBe(0)
    expect(r.bookingsBaseCents).toBe(0)
    expect(r.expensesBaseCents).toBe(0)
    expect(r.byCategory).toEqual([])
    expect(r.byCurrency).toEqual([])
    expect(r.missingRateCount).toBe(0)
  })

  it('sums base-currency bookings and expenses into the grand total', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: 30000 })],
      expenses: [expense({ amount_cents: 20000 })],
      baseCurrency: 'IDR',
    })
    expect(r.bookingsBaseCents).toBe(30000)
    expect(r.expensesBaseCents).toBe(20000)
    expect(r.grandTotalBaseCents).toBe(50000)
    expect(r.missingRateCount).toBe(0)
  })

  it('converts a foreign-currency line using its exchange_rate (rounded)', () => {
    const r = buildTripSpendReport({
      bookings: [],
      // 100 SGD (amount_cents 10000) * rate 116.5 = 1,165,000 cents
      expenses: [
        expense({ amount_cents: 10000, currency: 'SGD', exchange_rate: 116.5 }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.expensesBaseCents).toBe(1165000)
    expect(r.grandTotalBaseCents).toBe(1165000)
  })

  it('excludes a foreign line without a rate but still counts its currency', () => {
    const r = buildTripSpendReport({
      bookings: [],
      expenses: [
        expense({ amount_cents: 10000, currency: 'SGD', exchange_rate: null }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.grandTotalBaseCents).toBe(0)
    expect(r.missingRateCount).toBe(1)
    expect(r.byCurrency).toEqual([{ currency: 'SGD', cents: 10000 }])
  })

  it('skips a booking with a null amount entirely', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: null, currency: 'SGD' })],
      expenses: [],
      baseCurrency: 'IDR',
    })
    expect(r.grandTotalBaseCents).toBe(0)
    expect(r.missingRateCount).toBe(0)
    expect(r.byCurrency).toEqual([])
  })

  it('merges booking type and expense category into the same bucket', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ bucket: 'lodging', amount_cents: 30000 })],
      expenses: [expense({ bucket: 'lodging', amount_cents: 20000 })],
      baseCurrency: 'IDR',
    })
    expect(r.byCategory).toEqual([{ bucket: 'lodging', baseCents: 50000 }])
  })

  it('aggregates per currency with the base currency listed first', () => {
    const r = buildTripSpendReport({
      bookings: [booking({ amount_cents: 30000, currency: 'IDR' })],
      expenses: [
        expense({ amount_cents: 10000, currency: 'SGD', exchange_rate: 100 }),
        expense({ amount_cents: 5000, currency: 'SGD', exchange_rate: 100 }),
      ],
      baseCurrency: 'IDR',
    })
    expect(r.byCurrency).toEqual([
      { currency: 'IDR', cents: 30000 },
      { currency: 'SGD', cents: 15000 },
    ])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- trip-spend`
Expected: FAIL — `Cannot find module '@/lib/trip-spend'`.

- [ ] **Step 3: Implement `src/lib/trip-spend.ts`**

```typescript
// Unified spend buckets = union of booking types and expense categories.
// Both enums are already subsets of this set, so no lossy mapping is needed.
export type SpendBucket =
  | 'flight'
  | 'lodging'
  | 'transport'
  | 'activity'
  | 'food'
  | 'shopping'
  | 'other'

const BUCKET_ORDER: SpendBucket[] = [
  'flight',
  'lodging',
  'transport',
  'activity',
  'food',
  'shopping',
  'other',
]

// A booking line. `amount_cents` is nullable (a booking may not be priced yet).
export type SpendBooking = {
  bucket: SpendBucket
  amount_cents: number | null
  currency: string
  exchange_rate: number | null
}

// An expense line. `amount_cents` is always present (NOT NULL in the schema).
export type SpendExpense = {
  bucket: SpendBucket
  amount_cents: number
  currency: string
  exchange_rate: number | null
}

export type TripSpendReport = {
  grandTotalBaseCents: number
  bookingsBaseCents: number
  expensesBaseCents: number
  byCategory: { bucket: SpendBucket; baseCents: number }[]
  byCurrency: { currency: string; cents: number }[]
  missingRateCount: number
}

/**
 * Convert a money line to the trip's base currency.
 * - same currency as base → as-is
 * - has a manual exchange_rate → amount * rate (rounded to integer cents)
 * - otherwise → null (cannot convert; excluded from base totals)
 */
function toBaseCents(
  amountCents: number,
  currency: string,
  rate: number | null,
  baseCurrency: string
): number | null {
  if (currency === baseCurrency) return amountCents
  if (rate != null) return Math.round(amountCents * rate)
  return null
}

/**
 * Fold the two non-overlapping spend streams (bookings + expenses) into one
 * report. Bookings and expenses are summed independently — one transaction is
 * expected to live in exactly one stream (no double-count enforcement; D16).
 */
export function buildTripSpendReport({
  bookings,
  expenses,
  baseCurrency,
}: {
  bookings: SpendBooking[]
  expenses: SpendExpense[]
  baseCurrency: string
}): TripSpendReport {
  const byCurrency = new Map<string, number>()
  const byBucket = new Map<SpendBucket, number>()
  let grandTotalBaseCents = 0
  let bookingsBaseCents = 0
  let expensesBaseCents = 0
  let missingRateCount = 0

  const addCurrency = (currency: string, cents: number) => {
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + cents)
  }
  const addBucket = (bucket: SpendBucket, cents: number) => {
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + cents)
  }

  for (const b of bookings) {
    if (b.amount_cents == null) continue // not yet priced; skip entirely
    addCurrency(b.currency, b.amount_cents)
    const base = toBaseCents(
      b.amount_cents,
      b.currency,
      b.exchange_rate,
      baseCurrency
    )
    if (base == null) {
      missingRateCount += 1
      continue
    }
    grandTotalBaseCents += base
    bookingsBaseCents += base
    addBucket(b.bucket, base)
  }

  for (const e of expenses) {
    addCurrency(e.currency, e.amount_cents)
    const base = toBaseCents(
      e.amount_cents,
      e.currency,
      e.exchange_rate,
      baseCurrency
    )
    if (base == null) {
      missingRateCount += 1
      continue
    }
    grandTotalBaseCents += base
    expensesBaseCents += base
    addBucket(e.bucket, base)
  }

  const byCategory = BUCKET_ORDER.filter(
    (bucket) => (byBucket.get(bucket) ?? 0) !== 0
  ).map((bucket) => ({ bucket, baseCents: byBucket.get(bucket) as number }))

  // Base currency first, then the rest alphabetically — deterministic output.
  const byCurrencyList = [...byCurrency.entries()]
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => {
      if (a.currency === baseCurrency) return -1
      if (b.currency === baseCurrency) return 1
      return a.currency.localeCompare(b.currency)
    })

  return {
    grandTotalBaseCents,
    bookingsBaseCents,
    expensesBaseCents,
    byCategory,
    byCurrency: byCurrencyList,
    missingRateCount,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- trip-spend`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit** (after owner approval)

```bash
git add src/lib/trip-spend.ts tests/lib/trip-spend.test.ts
git commit -m "feat(expenses): add trip spend report builder"
```

---

## Task 2: Migration — `bookings.exchange_rate`

**Files:**
- Create: `supabase/migrations/<ts>_booking_exchange_rate.sql`
- Modify: `src/types/database.ts` (generated)

- [ ] **Step 1: Create the migration file**

Run: `supabase migration new booking_exchange_rate`

Put this SQL in the generated file:

```sql
-- Optional manual exchange rate from a booking's currency to the trip's
-- base_currency, mirroring expenses.exchange_rate (see D15/D16). No FX API.
alter table bookings
  add column exchange_rate numeric(20, 10);
```

- [ ] **Step 2: Push the migration** (after owner approval)

Run: `supabase db push`
Expected: applies the new migration with no errors.

- [ ] **Step 3: Regenerate types**

Run: `npm run db:types`
Expected: `src/types/database.ts` now lists `exchange_rate: number | null` under `bookings` Row/Insert/Update.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (column addition is additive).

- [ ] **Step 5: Commit** (after owner approval)

```bash
git add supabase/migrations/ src/types/database.ts
git commit -m "feat(bookings): add exchange_rate column"
```

---

## Task 3: Booking schema accepts `exchange_rate` — TDD

**Files:**
- Modify: `src/services/booking.service.ts:12-27` (add field to `bookingBaseSchema`)
- Test: `tests/schemas/booking.schema.test.ts`

- [ ] **Step 1: Write failing tests**

Append inside the existing `describe('createBookingSchema', ...)` block in `tests/schemas/booking.schema.test.ts`:

```typescript
  it('accepts a decimal exchange_rate', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      currency: 'SGD',
      exchange_rate: '11650.5',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty exchange_rate', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      currency: 'IDR',
      exchange_rate: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-numeric exchange_rate', () => {
    const result = createBookingSchema.safeParse({
      type: 'lodging',
      currency: 'SGD',
      exchange_rate: 'abc',
    })
    expect(result.success).toBe(false)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- booking.schema`
Expected: the "rejects a non-numeric exchange_rate" test FAILS (field currently ignored, so parse succeeds).

- [ ] **Step 3: Add the field to the schema**

In `src/services/booking.service.ts`, add to `bookingBaseSchema` (after the `amount` field, before `currency`), mirroring the expense schema:

```typescript
  // Optional manual exchange rate to the trip's base currency. Whole or decimal.
  exchange_rate: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Kurs harus berupa angka')
    .optional()
    .or(z.literal('')),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- booking.schema`
Expected: PASS.

- [ ] **Step 5: Commit** (after owner approval)

```bash
git add src/services/booking.service.ts tests/schemas/booking.schema.test.ts
git commit -m "feat(bookings): validate optional exchange_rate"
```

---

## Task 4: Booking service stores + selects `exchange_rate`

No unit test (per §10 we do not test DB queries); verify by typecheck/lint.

**Files:**
- Modify: `src/services/booking.service.ts` (list select line ~52, `createBooking` ~96, `updateBooking` ~125)

- [ ] **Step 1: Add `exchange_rate` to the list select**

In `listBookingsForTrip`, change the `.select(...)` string to include `exchange_rate`:

```typescript
    .select(
      'id, trip_id, type, provider, confirmation_code, booked_at, amount_cents, currency, exchange_rate'
    )
```

- [ ] **Step 2: Store it on create**

In `createBooking`, add to the `.insert({...})` object (after `currency: input.currency,`), mirroring the expense service:

```typescript
      exchange_rate: input.exchange_rate ? Number(input.exchange_rate) : null,
```

- [ ] **Step 3: Store it on update**

In `updateBooking`, add after the `currency` branch:

```typescript
  if (input.exchange_rate !== undefined)
    payload.exchange_rate = input.exchange_rate
      ? Number(input.exchange_rate)
      : null
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (depends on Task 2 types being regenerated).

- [ ] **Step 5: Commit** (after owner approval)

```bash
git add src/services/booking.service.ts
git commit -m "feat(bookings): persist exchange_rate in service layer"
```

---

## Task 5: Booking actions parse `exchange_rate`

**Files:**
- Modify: `src/app/(app)/trips/[id]/bookings/actions.ts` (both `createBookingAction` ~24 and `updateBookingAction` ~59)

- [ ] **Step 1: Add to both `safeParse` objects**

In BOTH `createBookingAction` and `updateBookingAction`, add to the parsed object (after `currency: formData.get('currency'),`), mirroring the expense action:

```typescript
    // The exchange_rate input is only rendered for non-base currencies, so it
    // may be absent; treat absent as undefined.
    exchange_rate: formData.get('exchange_rate') ?? undefined,
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit** (after owner approval)

```bash
git add "src/app/(app)/trips/[id]/bookings/actions.ts"
git commit -m "feat(bookings): pass exchange_rate from booking forms"
```

---

## Task 6: Booking forms render the rate field

Both forms read the trip's base currency from `useTrip()` (they render inside `<TripProvider>`), and show the optional rate input only when the selected currency differs from base — mirroring the expense dialog.

**Files:**
- Modify: `src/components/features/booking/new-booking-dialog.tsx`
- Modify: `src/components/features/booking/edit-booking-dialog.tsx`

- [ ] **Step 1: New-booking form — make currency controlled + add rate field**

In `new-booking-dialog.tsx`:

a) Add imports at the top (with the other imports):

```typescript
import { useTrip } from '@/components/features/trip/trip-context'
```

b) In `NewBookingForm`, add state above the `return`, after the `useActionState`/`useEffect` block:

```typescript
  const baseCurrency = useTrip().base_currency
  const [currency, setCurrency] = useState('IDR')
  const [rate, setRate] = useState('')
  const showRate = currency !== baseCurrency
```

(`useState` is already imported in this file.)

c) Replace the currency `<select>` (currently uncontrolled with `defaultValue="IDR"`) with a controlled one:

```tsx
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {BOOKING_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
```

d) Add the rate field immediately AFTER the closing `</div>` of the `grid grid-cols-[1fr_auto]` amount/currency row, before `<DialogFooter>`:

```tsx
      {showRate && (
        <div className="space-y-2">
          <Label htmlFor="exchange_rate">
            Kurs ke {baseCurrency} (opsional)
          </Label>
          <Input
            id="exchange_rate"
            name="exchange_rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={`1 ${currency} = ? ${baseCurrency}`}
          />
          {state.fieldErrors?.exchange_rate && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.exchange_rate[0]}
            </p>
          )}
        </div>
      )}
```

- [ ] **Step 2: Edit-booking form — add rate state + field**

In `edit-booking-dialog.tsx`:

a) Add `exchange_rate` to the exported `Booking` type (after `currency: string | null`):

```typescript
  exchange_rate: number | null
```

b) Add the import:

```typescript
import { useTrip } from '@/components/features/trip/trip-context'
```

c) In `EditBookingForm`, after the existing `const [currency, setCurrency] = ...` state, add:

```typescript
  const baseCurrency = useTrip().base_currency
  const [rate, setRate] = useState(
    booking.exchange_rate != null ? String(booking.exchange_rate) : ''
  )
  const showRate = currency !== baseCurrency
```

d) Add the same rate field block as Step 1(d), immediately after the closing `</div>` of the `grid grid-cols-[1fr_auto]` amount/currency row, before the `flex justify-end` button row:

```tsx
      {showRate && (
        <div className="space-y-2">
          <Label htmlFor="exchange_rate">
            Kurs ke {baseCurrency} (opsional)
          </Label>
          <Input
            id="exchange_rate"
            name="exchange_rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={`1 ${currency} = ? ${baseCurrency}`}
          />
          {state.fieldErrors?.exchange_rate && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.exchange_rate[0]}
            </p>
          )}
        </div>
      )}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (The `Booking` type now requires `exchange_rate`; Task 4 already added it to the list select, so the bookings page cast `as Booking[]` stays valid.)

- [ ] **Step 4: Commit** (after owner approval)

```bash
git add src/components/features/booking/new-booking-dialog.tsx src/components/features/booking/edit-booking-dialog.tsx
git commit -m "feat(bookings): add optional exchange rate input to booking forms"
```

---

## Task 7: `TripSpendReport` presentational component

A Server Component (no interactivity) that renders a `TripSpendReport` object. Bucket labels reuse Indonesian wording consistent with the app.

**Files:**
- Create: `src/components/features/trip/trip-spend-report.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { formatCurrency } from '@/lib/format'
import type { SpendBucket, TripSpendReport } from '@/lib/trip-spend'

const BUCKET_LABEL: Record<SpendBucket, string> = {
  flight: 'Penerbangan',
  lodging: 'Penginapan',
  transport: 'Transport',
  activity: 'Aktivitas',
  food: 'Makan',
  shopping: 'Belanja',
  other: 'Lainnya',
}

/**
 * Trip-level spending: a base-currency grand total split into the two
 * non-overlapping streams (bookings + expenses), a per-category breakdown, and
 * an exact per-currency breakdown. Lines without a usable rate are flagged.
 */
export function TripSpendReport({
  report,
  baseCurrency,
}: {
  report: TripSpendReport
  baseCurrency: string
}) {
  const {
    grandTotalBaseCents,
    bookingsBaseCents,
    expensesBaseCents,
    byCategory,
    byCurrency,
    missingRateCount,
  } = report

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-input p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            Total pengeluaran ({baseCurrency})
          </span>
          <span className="text-2xl font-semibold">
            {formatCurrency(grandTotalBaseCents, baseCurrency)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-muted-foreground">Bookings</div>
            <div className="font-medium">
              {formatCurrency(bookingsBaseCents, baseCurrency)}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-muted-foreground">Expenses</div>
            <div className="font-medium">
              {formatCurrency(expensesBaseCents, baseCurrency)}
            </div>
          </div>
        </div>

        {missingRateCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {missingRateCount} item tanpa kurs belum masuk total {baseCurrency}.
          </p>
        )}
      </div>

      {byCategory.length > 0 && (
        <div className="rounded-lg border border-input p-4">
          <h3 className="text-sm font-medium">Per kategori</h3>
          <dl className="mt-2 space-y-1 text-sm">
            {byCategory.map(({ bucket, baseCents }) => (
              <div key={bucket} className="flex justify-between">
                <dt className="text-muted-foreground">{BUCKET_LABEL[bucket]}</dt>
                <dd>{formatCurrency(baseCents, baseCurrency)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {byCurrency.length > 1 && (
        <div className="rounded-lg border border-input p-4">
          <h3 className="text-sm font-medium">Per mata uang</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {byCurrency.map(({ currency, cents }) => (
              <span key={currency}>{formatCurrency(cents, currency)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit** (after owner approval)

```bash
git add src/components/features/trip/trip-spend-report.tsx
git commit -m "feat(expenses): add trip spend report component"
```

---

## Task 8: Wire the Overview page

The Overview page (`/trips/[id]`) fetches trip + bookings + expenses, builds the report, and renders it — or an `EmptyState` when there is nothing to show.

**Files:**
- Modify: `src/app/(app)/trips/[id]/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

Replace the entire contents of `src/app/(app)/trips/[id]/page.tsx`:

```tsx
import { BookOpenText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@/services/trip.service'
import { listBookingsForTrip } from '@/services/booking.service'
import { listExpensesForTrip } from '@/services/expense.service'
import { buildTripSpendReport } from '@/lib/trip-spend'
import { TripSpendReport } from '@/components/features/trip/trip-spend-report'
import { EmptyState } from '@/components/ui/empty-state'

export default async function TripOverviewPage({
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

  const [trip, bookings, expenses] = await Promise.all([
    getTripById(supabase, id, user.id),
    listBookingsForTrip(supabase, id, user.id),
    listExpensesForTrip(supabase, id, user.id),
  ])

  const baseCurrency = trip?.base_currency ?? 'IDR'

  if (bookings.length === 0 && expenses.length === 0) {
    return (
      <EmptyState
        icon={BookOpenText}
        title="Overview trip"
        description="Tambahkan booking atau expense untuk melihat ringkasan pengeluaran trip di sini."
      />
    )
  }

  const report = buildTripSpendReport({
    bookings: bookings.map((b) => ({
      bucket: b.type,
      amount_cents: b.amount_cents,
      currency: b.currency ?? baseCurrency,
      exchange_rate: b.exchange_rate,
    })),
    expenses: expenses.map((e) => ({
      bucket: e.category,
      amount_cents: e.amount_cents,
      currency: e.currency,
      exchange_rate: e.exchange_rate,
    })),
    baseCurrency,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ringkasan pengeluaran</h2>
      <TripSpendReport report={report} baseCurrency={baseCurrency} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (`b.type`/`e.category` are subsets of `SpendBucket`, so assignable.)

- [ ] **Step 3: Manual smoke test**

With `npm run dev` running, as a logged-in user:
1. Open a trip with no bookings/expenses → Overview shows the empty state.
2. Add an IDR booking with an amount and an IDR expense → Overview shows a grand total = their sum, both source subtotals, and per-category rows.
3. Add an SGD expense WITHOUT a rate → it appears under "Per mata uang" and the "N item tanpa kurs" note shows; grand total unchanged.
4. Edit that SGD expense/booking, set a rate → grand total now includes the converted amount; the note's count drops.

- [ ] **Step 4: Commit** (after owner approval)

```bash
git add "src/app/(app)/trips/[id]/page.tsx"
git commit -m "feat(expenses): show combined spend report on trip overview"
```

---

## Task 9: Documentation (AGENTS.md §4 + D16)

**Files:**
- Modify: `AGENTS.md` (§4 bookings table, §12 decision log)

- [ ] **Step 1: Update §4 bookings schema**

In the `bookings` table block in §4, add after the `currency (text, default 'IDR')` line:

```
  exchange_rate (numeric(20, 10), nullable)
    ← optional manual rate to the trip's base_currency (mirrors expenses; D16)
```

- [ ] **Step 2: Add decision D16**

Append to §12:

```markdown
### D16: Trip spend report combines bookings + expenses as non-overlapping streams

**Date**: 2026-06-19.

**Context**: Both `bookings` and `expenses` carry money, raising the question of
how to report total trip spending without double-counting.

**Decision**: Treat bookings and expenses as two **non-overlapping** spend
streams — big-ticket prepaid/arranged items live as bookings, on-the-ground
cash spend lives as expenses — and report `total = bookings + expenses`. No
system-level double-count prevention (discipline rests with the user). Added
`bookings.exchange_rate` (migration `<ts>_booking_exchange_rate.sql`) so booking
amounts convert to the trip `base_currency` via the same manual-FX model as
expenses (D15). The Overview page hosts the report: a base-currency grand total,
per-source subtotals, a per-category breakdown over a unified 7-bucket set
(union of `booking.type` + `expense.category`), and an exact per-currency
breakdown. Settlement stays expense-only (bookings have no payer/split).

**Trade-offs accepted**: No double-count enforcement; the grand total only
includes lines that are in the base currency or carry a manual rate (others are
flagged). `flight` is kept as its own bucket rather than folded into transport.

**Reversibility**: High — `exchange_rate` is additive; the report is read-only
derivation over existing data.
```

- [ ] **Step 3: Commit** (after owner approval)

```bash
git add AGENTS.md
git commit -m "docs: document trip spend report and decision D16"
```

---

## Final verification

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run test` — all pass (Task 1 adds ~7, Task 3 adds 3)
- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] Manual smoke test (Task 8 Step 3) walked through
```
