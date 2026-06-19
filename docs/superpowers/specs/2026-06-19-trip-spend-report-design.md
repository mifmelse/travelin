# Design: Trip Spend Report (combined bookings + expenses)

**Date:** 2026-06-19
**Status:** Approved (design), pending implementation plan
**Feature:** A trip-level spending report on the Overview page that combines
booking costs and expense costs into one picture.

---

## 1. Problem & locked decisions

Bookings and expenses both carry money, which raised the question: are they the
same thing, and how should "total trip spending" be reported without
double-counting?

**Conceptual answer:** they are intentionally different (see schema §4 of
AGENTS.md). A *booking* is a record of an externally-arranged reservation
(provider, confirmation code, `booked_at`); its `amount_cents` is nullable
metadata. An *expense* is an actual cash outflow with `paid_by`, splits, and
settlement. Booking answers "what did I arrange"; expense answers "who spent
what and who owes whom".

**Chosen mental model:** bookings and expenses are **two non-overlapping
streams** of spend. Big-ticket prepaid/arranged items live as bookings;
on-the-ground cash spend lives as expenses. Trip total = sum of both. There is
**no double-count by convention** — one transaction lives in exactly one place.
The discipline rests with the user (accepted trade-off; no system enforcement).

Locked decisions:
- **FX = Option A.** `bookings` gains a manual per-row `exchange_rate` to the
  trip's `base_currency`, mirroring `expenses` exactly. No FX API (consistent
  with D15).
- **Granularity = per-category.** Report breaks down by a unified bucket set
  that merges `booking.type` and `expense.category`.
- **Home = Overview page** `/trips/[id]` (currently an empty placeholder that
  explicitly anticipates this).
- **Settlement stays expense-only.** Bookings have no `paid_by`/split, so the
  "who owes whom" balance view (`expense-balance`) is untouched.

## 2. Data model change

New additive migration `supabase/migrations/<timestamp>_booking_exchange_rate.sql`:

```sql
ALTER TABLE bookings ADD COLUMN exchange_rate numeric(20, 10);
```

Type matches `expenses.exchange_rate` exactly. Nullable (optional manual rate).

Post-migration steps (per AGENTS.md §11): `supabase db push` (owner runs/approves
— no DB push without permission), then `npm run db:types`, then update AGENTS.md
§4 bookings schema and add decision **D16**.

## 3. Category unification

Union of 7 buckets, no lossy mapping — each enum value maps to a same-named
bucket. `flight` stays separate from `transport` (meaningful big bucket for a
travel app).

| Bucket    | from `booking.type` | from `expense.category` |
|-----------|---------------------|-------------------------|
| flight    | flight              | —                       |
| lodging   | lodging             | lodging                 |
| transport | transport           | transport               |
| activity  | activity            | activity                |
| food      | —                   | food                    |
| shopping  | —                   | shopping                |
| other     | other               | other                   |

## 4. Reporting logic (pure function)

New file `src/lib/trip-spend.ts` exporting a pure function:

```
buildTripSpendReport({ bookings, expenses, baseCurrency }) -> TripSpendReport
```

Per-line conversion to base currency (generalizes the existing `ExpenseTotals`
logic so both sources share one rule):

- `currency === baseCurrency` → `baseCents = amount_cents`
- `exchange_rate != null`     → `baseCents = Math.round(amount_cents * rate)`
- otherwise                   → **excluded** from base totals, counted in
  `missingRateCount`
- a booking with `amount_cents === null` → **skipped entirely** (not yet priced;
  not treated as 0)

Returned shape (`TripSpendReport`):
- `grandTotalBaseCents` — sum of all convertible booking + expense base cents
- `bookingsBaseCents`, `expensesBaseCents` — per-source base subtotals
- `byCategory: { bucket, baseCents }[]` — base subtotal per unified bucket
  (only convertible items contribute)
- `byCurrency: { currency, cents }[]` — exact, every priced item, no conversion
- `missingRateCount` — count of priced items excluded from base totals

This is pure money math → fits Level 1 testing (§10). Input types use the
existing row shapes (`Pick<...>` of the generated DB types) to stay decoupled
from full row objects.

## 5. UI

- **Overview page** (`src/app/(app)/trips/[id]/page.tsx`) becomes a Server
  Component: fetch `listBookingsForTrip` + `listExpensesForTrip` via the service
  layer with `userId` (pattern §7), read `base_currency` from `TripProvider`,
  call `buildTripSpendReport`, render. When both lists are empty, keep an
  `EmptyState`.
- **New component** `src/components/features/trip/trip-spend-report.tsx`:
  grand-total card, two source subtotals (Bookings / Expenses), per-category
  table, per-currency line, and a "N item tanpa kurs belum masuk total {base}"
  flag (mirrors `ExpenseTotals` copy).
- **Booking forms** (new dialog + `edit-booking-dialog.tsx`): add an optional
  "Kurs ke {baseCurrency}" field, mirroring the expense form field exactly.
  Booking Zod schema + `createBooking`/`updateBooking` service accept
  `exchange_rate`.

## 6. Testing

- `tests/lib/trip-spend.test.ts` — grand total, exact per-currency, per-category,
  missing-rate exclusion, null-amount booking skipped, multi-currency mix,
  empty input.
- Extend `tests/schemas/booking.schema.test.ts` — `exchange_rate` optional and,
  when present, must be positive.

## 7. Out of scope (YAGNI)

- No automatic double-count prevention (by convention only).
- Settlement does not touch bookings.
- No FX API — rates stay manual (D15).

## 8. Files touched (summary)

| Action | Path |
|---|---|
| add migration | `supabase/migrations/<ts>_booking_exchange_rate.sql` |
| regenerate | `src/types/database.ts` (via `npm run db:types`) |
| new | `src/lib/trip-spend.ts` |
| new | `src/components/features/trip/trip-spend-report.tsx` |
| edit | `src/app/(app)/trips/[id]/page.tsx` |
| edit | `src/services/booking.service.ts` (schema + create/update) |
| edit | `src/components/features/booking/edit-booking-dialog.tsx` |
| edit | `src/components/features/booking/new-booking-dialog.tsx` |
| new tests | `tests/lib/trip-spend.test.ts` |
| edit tests | `tests/schemas/booking.schema.test.ts` |
| docs | AGENTS.md §4 (bookings) + D16 |
