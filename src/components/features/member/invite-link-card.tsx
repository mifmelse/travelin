'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, RefreshCw, Trash2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  generateInviteAction,
  setInviteRoleAction,
  revokeInviteAction,
} from '@/app/(app)/trips/[id]/members/actions'

type Invite = { token: string; role: 'editor' | 'viewer' } | null

export function InviteLinkCard({
  tripId,
  invite,
}: {
  tripId: string
  invite: Invite
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const url =
    invite && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${invite.token}`
      : ''

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Link undangan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!invite ? (
          <Button
            disabled={pending}
            onClick={() => run(() => generateInviteAction(tripId, 'editor'))}
          >
            {pending ? 'Membuat...' : 'Buat link undangan'}
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label="Salin link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role saat join</Label>
              <select
                id="invite-role"
                value={invite.role}
                disabled={pending}
                onChange={(e) =>
                  run(() =>
                    setInviteRoleAction(tripId, e.target.value as 'editor' | 'viewer')
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="editor">Editor (bisa ngedit isi trip)</option>
                <option value="viewer">Viewer (cuma bisa lihat)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => generateInviteAction(tripId, invite.role))}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="text-destructive"
                onClick={() => setRevokeOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan link undangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Link yang sekarang bakal berhenti berfungsi. Kamu bisa bikin link
              baru kapan aja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setRevokeOpen(false)
                run(() => revokeInviteAction(tripId))
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
