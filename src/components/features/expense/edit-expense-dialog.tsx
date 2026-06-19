'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CURRENCIES } from '@/lib/currency'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from './expense-meta'
import { SplitEditor, type SplitMember } from './split-editor'
import { updateExpenseAction } from '@/app/(app)/trips/[id]/expenses/actions'

export type ExpenseSplit = {
  id: string
  profile_id: string
  share_cents: number
  settled: boolean
  settled_at: string | null
}

export type Expense = {
  id: string
  trip_id: string
  paid_by: string
  amount_cents: number
  currency: string
  exchange_rate: number | null
  category: ExpenseCategory
  description: string | null
  occurred_at: string
  expense_splits: ExpenseSplit[]
}

function toDatetimeLocal(value: string | null): string {
  return value ? value.slice(0, 16) : ''
}

function toWholeInput(amountCents: number | null): string {
  return amountCents == null ? '' : String(Math.round(amountCents / 100))
}

export function EditExpenseDialog({
  expense,
  members,
  baseCurrency,
  open,
  onOpenChange,
}: {
  expense: Expense
  members: SplitMember[]
  baseCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
          <DialogDescription>Update detail pengeluaran</DialogDescription>
        </DialogHeader>
        {open && (
          <EditExpenseForm
            key={`${expense.id}-${open}`}
            expense={expense}
            members={members}
            baseCurrency={baseCurrency}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditExpenseForm({
  expense,
  members,
  baseCurrency,
  onSuccess,
  onCancel,
}: {
  expense: Expense
  members: SplitMember[]
  baseCurrency: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(
    updateExpenseAction.bind(null, expense.trip_id, expense.id),
    {}
  )

  const [amount, setAmount] = useState(toWholeInput(expense.amount_cents))
  const [currency, setCurrency] = useState(expense.currency)
  const [paidBy, setPaidBy] = useState(expense.paid_by)
  const [category, setCategory] = useState<ExpenseCategory>(expense.category)
  const [description, setDescription] = useState(expense.description ?? '')
  const [occurredAt, setOccurredAt] = useState(
    toDatetimeLocal(expense.occurred_at)
  )
  const [rate, setRate] = useState(
    expense.exchange_rate != null ? String(expense.exchange_rate) : ''
  )

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state.success, onSuccess])

  const amountWhole = /^\d+$/.test(amount) ? Number(amount) : 0
  const showRate = currency !== baseCurrency

  const defaultSplits = expense.expense_splits.map((s) => ({
    profile_id: s.profile_id,
    share_cents: s.share_cents,
  }))

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Jumlah *</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {state.fieldErrors?.amount && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.amount[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Mata uang</Label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="paid_by">Dibayar oleh</Label>
          <select
            id="paid_by"
            name="paid_by"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {members.map((m) => (
              <option key={m.profile_id} value={m.profile_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="occurred_at">Tanggal</Label>
          <Input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>
      </div>

      {members.length > 1 && (
        <SplitEditor
          members={members}
          amountWhole={amountWhole}
          currency={currency}
          defaultSplits={defaultSplits}
        />
      )}
      {state.fieldErrors?.splits && (
        <p className="text-sm text-destructive">
          {state.fieldErrors.splits[0]}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
