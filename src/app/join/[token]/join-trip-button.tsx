'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { joinTripAction, type JoinState } from './actions'

export function JoinTripButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    joinTripAction.bind(null, token),
    {}
  )

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Joining...' : 'Join trip'}
      </Button>
    </form>
  )
}
