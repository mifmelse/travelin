'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, UserMinus, ArrowLeftRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  updateMemberRoleAction,
  removeMemberAction,
} from '@/app/(app)/trips/[id]/members/actions'

export function MemberActionsMenu({
  tripId,
  memberProfileId,
  memberName,
  role,
}: {
  tripId: string
  memberProfileId: string
  memberName: string
  role: 'editor' | 'viewer'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removeOpen, setRemoveOpen] = useState(false)
  const nextRole = role === 'editor' ? 'viewer' : 'editor'

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result?.error) alert(result.error)
      else router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          aria-label={`Kelola ${memberName}`}
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              run(() => updateMemberRoleAction(tripId, memberProfileId, nextRole))
            }
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Ubah jadi {nextRole === 'editor' ? 'Editor' : 'Viewer'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setRemoveOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Keluarkan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluarkan {memberName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberName} bakal kehilangan akses ke trip ini. Bisa diundang lagi
              pakai link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setRemoveOpen(false)
                run(() => removeMemberAction(tripId, memberProfileId))
              }}
            >
              Keluarkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
