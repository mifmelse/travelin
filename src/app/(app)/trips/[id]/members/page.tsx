import { Crown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listTripMembers, getInvite } from '@/services/member.service'
import { SectionHeader } from '@/components/ui/section-header'
import { ItemRow } from '@/components/ui/item-row'
import { RoleBadge } from '@/components/features/member/role-badge'
import { InviteLinkCard } from '@/components/features/member/invite-link-card'
import { MemberActionsMenu } from '@/components/features/member/member-actions-menu'
import { LeaveTripButton } from '@/components/features/member/leave-trip-button'

export default async function TripMembersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const members = await listTripMembers(supabase, id, user.id)
  const isOwner = members.some(
    (m) => m.profile_id === user.id && m.role === 'owner'
  )
  const invite = isOwner ? await getInvite(supabase, id, user.id) : null

  return (
    <div className="space-y-6">
      {isOwner && <InviteLinkCard tripId={id} invite={invite} />}

      <div className="space-y-3">
        <SectionHeader title={`Anggota (${members.length})`} />
        <div className="space-y-2">
          {members.map((m) => {
            const isSelf = m.profile_id === user.id
            const canManage = isOwner && m.role !== 'owner'
            return (
              <ItemRow
                key={m.profile_id}
                icon={m.role === 'owner' ? Crown : User}
                iconTone={m.role === 'owner' ? 'primary' : 'muted'}
                title={`${m.display_name}${isSelf ? ' (kamu)' : ''}`}
                actions={
                  <div className="flex items-center gap-2">
                    <RoleBadge role={m.role} />
                    {canManage && (
                      <MemberActionsMenu
                        tripId={id}
                        memberProfileId={m.profile_id}
                        memberName={m.display_name}
                        role={m.role as 'editor' | 'viewer'}
                      />
                    )}
                  </div>
                }
              />
            )
          })}
        </div>
      </div>

      {!isOwner && (
        <div className="flex justify-end">
          <LeaveTripButton tripId={id} />
        </div>
      )}
    </div>
  )
}
