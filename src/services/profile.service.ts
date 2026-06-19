import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  user: User
) {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to check profile: ${fetchError.message}`)
  }

  if (existing) return existing

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Traveler'

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create profile: ${insertError.message}`)
  }

  return created
}

export async function getCurrentProfile(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return data
}