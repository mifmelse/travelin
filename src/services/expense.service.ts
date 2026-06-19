import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertTripMember, assertTripEditor } from '@/services/trip.service'
import { parseAmountToCents } from '@/lib/format'
import { CURRENCIES } from '@/lib/currency'

// =========================================
// SCHEMAS
// =========================================

const splitSchema = z.object({
  profile_id: z.string().uuid(),
  // share in integer cents (value * 100); UI builds these from whole units.
  share_cents: z.number().int().nonnegative(),
})

const expenseBaseSchema = z.object({
  description: z
    .string()
    .max(200, 'Deskripsi maksimal 200 karakter')
    .optional()
    .or(z.literal('')),
  category: z.enum([
    'food',
    'transport',
    'lodging',
    'activity',
    'shopping',
    'other',
  ]),
  amount: z
    .string()
    .regex(/^\d+$/, 'Jumlah harus angka bulat tanpa desimal'),
  currency: z.enum(CURRENCIES),
  // Optional manual exchange rate to the trip's base currency. Whole or decimal.
  exchange_rate: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Kurs harus berupa angka')
    .optional()
    .or(z.literal('')),
  occurred_at: z.string().optional().or(z.literal('')),
  paid_by: z.string().uuid('Pembayar tidak valid'),
  // Absent/empty = unsplit expense (just a personal log).
  splits: z.array(splitSchema).optional(),
})

// Split shares, when present, must sum exactly to the expense amount (in cents).
// Kept as a standalone refine because `.partial()` does not chain with
// `.refine()` in Zod v4 (see AGENTS.md §8).
const splitSumRefine = (data: {
  amount?: string
  splits?: { share_cents: number }[]
}) => {
  if (!data.splits || data.splits.length === 0) return true
  if (!data.amount || !/^\d+$/.test(data.amount)) return true
  const amountCents = Number(data.amount) * 100
  const sum = data.splits.reduce((acc, s) => acc + s.share_cents, 0)
  return sum === amountCents
}
const splitSumError = {
  message: 'Total split harus sama dengan jumlah expense',
  path: ['splits'],
}

export const createExpenseSchema = expenseBaseSchema.refine(
  splitSumRefine,
  splitSumError
)
export const updateExpenseSchema = expenseBaseSchema
  .partial()
  .refine(splitSumRefine, splitSumError)

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>

// =========================================
// INTERNAL HELPERS
// =========================================

/** Set of profile_ids that are members of the trip. */
async function getTripMemberIds(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('profile_id')
    .eq('trip_id', tripId)
  if (error) throw new Error(`Failed to load trip members: ${error.message}`)
  return new Set((data ?? []).map((r) => r.profile_id))
}

/**
 * Assert that the payer and every split participant belong to the trip.
 * Prevents assigning an expense or a share to a non-member.
 */
async function assertValidParticipants(
  supabase: SupabaseClient<Database>,
  tripId: string,
  paidBy: string,
  splits: { profile_id: string }[] | undefined
) {
  const memberIds = await getTripMemberIds(supabase, tripId)
  if (!memberIds.has(paidBy)) {
    throw new Error('Pembayar bukan anggota trip ini')
  }
  for (const split of splits ?? []) {
    if (!memberIds.has(split.profile_id)) {
      throw new Error('Salah satu peserta split bukan anggota trip ini')
    }
  }
}

async function getExpenseTripId(
  supabase: SupabaseClient<Database>,
  expenseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('expenses')
    .select('trip_id')
    .eq('id', expenseId)
    .maybeSingle()
  return data?.trip_id ?? null
}

async function getSplitTripId(
  supabase: SupabaseClient<Database>,
  splitId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('expense_splits')
    .select('expenses(trip_id)')
    .eq('id', splitId)
    .maybeSingle()
  if (!data) return null
  const exp = data.expenses
  const trip = Array.isArray(exp) ? exp[0] : exp
  return trip?.trip_id ?? null
}

// =========================================
// QUERIES
// =========================================

/**
 * List expenses for a trip, each with its splits. Requires trip membership.
 * Ordered most-recent first by occurred_at.
 */
export async function listExpensesForTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
) {
  await assertTripMember(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `id, trip_id, paid_by, amount_cents, currency, exchange_rate,
       category, description, occurred_at,
       expense_splits(id, profile_id, share_cents, settled, settled_at)`
    )
    .eq('trip_id', tripId)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list expenses: ${error.message}`)
  return data
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create an expense (and its splits, atomically). Requires owner/editor.
 * If split insert fails, the expense is rolled back.
 */
export async function createExpense(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  input: CreateExpenseInput
) {
  await assertTripEditor(supabase, tripId, userId)
  await assertValidParticipants(supabase, tripId, input.paid_by, input.splits)

  const amountCents = parseAmountToCents(input.amount)
  if (amountCents == null) throw new Error('Jumlah expense wajib diisi')

  const payload: Database['public']['Tables']['expenses']['Insert'] = {
    trip_id: tripId,
    paid_by: input.paid_by,
    amount_cents: amountCents,
    currency: input.currency,
    exchange_rate: input.exchange_rate ? Number(input.exchange_rate) : null,
    category: input.category,
    description: input.description || null,
  }
  if (input.occurred_at) payload.occurred_at = input.occurred_at

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`Failed to create expense: ${error.message}`)

  if (input.splits && input.splits.length > 0) {
    const rows = input.splits.map((s) => ({
      expense_id: expense.id,
      profile_id: s.profile_id,
      share_cents: s.share_cents,
    }))
    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(rows)
    if (splitError) {
      // Rollback: cascade deletes any partially-inserted splits too.
      await supabase.from('expenses').delete().eq('id', expense.id)
      throw new Error(`Failed to create splits: ${splitError.message}`)
    }
  }

  return expense
}

/**
 * Update an expense and replace its splits. Requires owner/editor.
 * NOTE: replacing splits resets their `settled` state — editing an expense's
 * amount or participants invalidates any prior settlement anyway.
 */
export async function updateExpense(
  supabase: SupabaseClient<Database>,
  expenseId: string,
  userId: string,
  input: UpdateExpenseInput
) {
  const tripId = await getExpenseTripId(supabase, expenseId)
  if (!tripId) throw new Error('Expense not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  if (input.paid_by !== undefined || input.splits !== undefined) {
    await assertValidParticipants(
      supabase,
      tripId,
      input.paid_by ?? '',
      input.splits
    )
  }

  type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']
  const payload: ExpenseUpdate = {}
  if (input.paid_by !== undefined) payload.paid_by = input.paid_by
  if (input.amount !== undefined) {
    const cents = parseAmountToCents(input.amount)
    if (cents == null) throw new Error('Jumlah expense wajib diisi')
    payload.amount_cents = cents
  }
  if (input.currency !== undefined) payload.currency = input.currency
  if (input.exchange_rate !== undefined)
    payload.exchange_rate = input.exchange_rate
      ? Number(input.exchange_rate)
      : null
  if (input.category !== undefined) payload.category = input.category
  if (input.description !== undefined)
    payload.description = input.description || null
  if (input.occurred_at !== undefined && input.occurred_at)
    payload.occurred_at = input.occurred_at

  const { data: expense, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', expenseId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update expense: ${error.message}`)

  // Replace splits when provided.
  if (input.splits !== undefined) {
    const { error: delError } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId)
    if (delError)
      throw new Error(`Failed to replace splits: ${delError.message}`)

    if (input.splits.length > 0) {
      const rows = input.splits.map((s) => ({
        expense_id: expenseId,
        profile_id: s.profile_id,
        share_cents: s.share_cents,
      }))
      const { error: insError } = await supabase
        .from('expense_splits')
        .insert(rows)
      if (insError)
        throw new Error(`Failed to replace splits: ${insError.message}`)
    }
  }

  return expense
}

/**
 * Delete an expense (splits cascade). Requires owner/editor.
 */
export async function deleteExpense(
  supabase: SupabaseClient<Database>,
  expenseId: string,
  userId: string
) {
  const tripId = await getExpenseTripId(supabase, expenseId)
  if (!tripId) throw new Error('Expense not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) throw new Error(`Failed to delete expense: ${error.message}`)
}

/**
 * Toggle a split's settled state. Any trip member may settle (sub-decision:
 * settling is a shared bookkeeping action, not owner-only).
 */
export async function toggleSplitSettled(
  supabase: SupabaseClient<Database>,
  splitId: string,
  userId: string,
  settled: boolean
) {
  const tripId = await getSplitTripId(supabase, splitId)
  if (!tripId) throw new Error('Split not found or access denied')
  await assertTripMember(supabase, tripId, userId)

  const { error } = await supabase
    .from('expense_splits')
    .update({
      settled,
      settled_at: settled ? new Date().toISOString() : null,
    })
    .eq('id', splitId)

  if (error) throw new Error(`Failed to update split: ${error.message}`)
}
