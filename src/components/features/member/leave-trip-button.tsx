'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { leaveTripAction } from '@/app/(app)/trips/[id]/members/actions'

export function LeaveTripButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      // leaveTripAction redirects on success; only returns on error.
      const result = await leaveTripAction(tripId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
      <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
        <LogOut className="mr-2 h-4 w-4" />
        Leave trip
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari trip ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu bakal kehilangan akses. Bisa join lagi kalau dapet link undangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="px-1 text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={handleLeave}
            >
              {pending ? 'Keluar...' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
