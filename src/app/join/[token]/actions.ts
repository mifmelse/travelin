'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinTripViaToken } from '@/services/member.service'

export type JoinState = { error?: string }

export async function joinTripAction(
  token: string,
  _prev: JoinState,
  _formData: FormData
): Promise<JoinState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect_to=/join/${token}`)

  let tripId: string
  try {
    const result = await joinTripViaToken(supabase, token, user.id)
    tripId = result.tripId
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Gagal join trip' }
  }

  revalidatePath('/dashboard')
  redirect(`/trips/${tripId}`)
}
