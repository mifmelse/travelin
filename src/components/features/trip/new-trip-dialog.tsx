'use client'

import { useState, useActionState } from 'react'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  createTripAction,
  type ActionState,
} from '@/app/(app)/trips/actions'

const initialState: ActionState = {}

export function NewTripDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    createTripAction,
    initialState
  )

  // Note: kalau success, Server Action redirect, jadi dialog ga sempet close manual.
  // Tapi kalau ada error, dialog tetep kebuka biar user bisa fix.

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        Trip baru
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Bikin trip baru</DialogTitle>
          <DialogDescription>
            Isi info dasar trip lo. Detail bisa dilengkapin nanti.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Judul *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Bali Trip Maret 2026"
              required
              autoFocus
            />
            {state.fieldErrors?.title && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.title[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destinasi</Label>
            <Input
              id="destination"
              name="destination"
              placeholder="Bali, Indonesia"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Mulai</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Selesai</Label>
              <Input id="end_date" name="end_date" type="date" />
              {state.fieldErrors?.end_date && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.end_date[0]}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_currency">Mata uang utama</Label>
            <select
              id="base_currency"
              name="base_currency"
              defaultValue="IDR"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Mata uang dasar untuk total pengeluaran trip.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Family trip dengan adik kakak..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Menyimpan...' : 'Buat trip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}