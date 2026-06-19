'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createExpense,
  updateExpense,
  deleteExpense,
  toggleSplitSettled,
  createExpenseSchema,
  updateExpenseSchema,
} from '@/services/expense.service'

export type ActionState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// Splits arrive as a JSON string in a hidden form field. Returns undefined for
// an empty/absent field, or null when the JSON is malformed (treated as error).
function parseSplits(raw: FormDataEntryValue | null): unknown {
  if (raw == null || raw === '') return undefined
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

function buildPayload(formData: FormData) {
  return {
    paid_by: formData.get('paid_by'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    // The exchange_rate input is only rendered for non-base currencies, so it
    // can be absent (null). Coerce to undefined so the optional schema accepts it.
    exchange_rate: formData.get('exchange_rate') ?? undefined,
    category: formData.get('category'),
    description: formData.get('description'),
    occurred_at: formData.get('occurred_at'),
    splits: parseSplits(formData.get('splits')),
  }
}

export async function createExpenseAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createExpenseSchema.safeParse(buildPayload(formData))
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await createExpense(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/expenses`)
  return { success: true }
}

export async function updateExpenseAction(
  tripId: string,
  expenseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateExpenseSchema.safeParse(buildPayload(formData))
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await updateExpense(supabase, expenseId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/expenses`)
  return { success: true }
}

export async function deleteExpenseAction(
  tripId: string,
  expenseId: string
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await deleteExpense(supabase, expenseId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/expenses`)
  return { success: true }
}

export async function toggleSettleAction(
  tripId: string,
  splitId: string,
  settled: boolean
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await toggleSplitSettled(supabase, splitId, user.id, settled)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/expenses`)
  return { success: true }
}
