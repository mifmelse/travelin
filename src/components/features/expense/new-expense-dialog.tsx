'use client'

import { useState, useActionState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CURRENCIES } from '@/lib/currency'
import { EXPENSE_CATEGORIES } from './expense-meta'
import { SplitEditor, type SplitMember } from './split-editor'
import {
  createExpenseAction,
  type ActionState,
} from '@/app/(app)/trips/[id]/expenses/actions'

export function NewExpenseDialog({
  tripId,
  members,
  currentUserId,
  baseCurrency,
}: {
  tripId: string
  members: SplitMember[]
  currentUserId: string
  baseCurrency: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        Tambah expense
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tambah expense</DialogTitle>
          <DialogDescription>
            Catat pengeluaran trip, bisa dibagi antar anggota.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <NewExpenseForm
            key={tripId}
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            baseCurrency={baseCurrency}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewExpenseForm({
  tripId,
  members,
  currentUserId,
  baseCurrency,
  onSuccess,
  onCancel,
}: {
  tripId: string
  members: SplitMember[]
  currentUserId: string
  baseCurrency: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createExpenseAction.bind(null, tripId),
    {}
  )

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(baseCurrency)
  const [paidBy, setPaidBy] = useState(currentUserId)

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state.success, onSuccess])

  const amountWhole = /^\d+$/.test(amount) ? Number(amount) : 0
  const showRate = currency !== baseCurrency

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
            placeholder="150000"
            autoFocus
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
            placeholder={`1 ${currency} = ? ${baseCurrency}`}
          />
          <p className="text-xs text-muted-foreground">
            Isi kurs aktual yang lo kena agar masuk ke total {baseCurrency}.
            Kosongkan kalau cukup ditampilkan terpisah.
          </p>
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
          defaultValue="food"
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
          placeholder="Makan malam di Bangkok..."
        />
        {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.description[0]}
          </p>
        )}
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
          <Input id="occurred_at" name="occurred_at" type="datetime-local" />
        </div>
      </div>

      {members.length > 1 && (
        <SplitEditor
          members={members}
          amountWhole={amountWhole}
          currency={currency}
        />
      )}
      {state.fieldErrors?.splits && (
        <p className="text-sm text-destructive">
          {state.fieldErrors.splits[0]}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Tambah'}
        </Button>
      </DialogFooter>
    </form>
  )
}
