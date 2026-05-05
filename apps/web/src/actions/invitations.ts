'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { queries } from '@workspace/db/queries'
import { cacheTag } from 'next/cache'
import { getMembership } from './membership'

type GetInvitationParams = {
  invitationId: string
}

export async function getInvitation({ invitationId }: GetInvitationParams) {
  const { user } = await authenticatedUser()

  const invitation = await queries.ctx.getInvitation(
    { userId: user.id },
    { invitationId },
  )

  return invitation
}

type ListPendingInvitationsParams = {
  organizationSlug: string
}

export async function listPendingInvitations({
  organizationSlug,
}: ListPendingInvitationsParams) {
  'use cache: private'
  cacheTag('invite-member', 'cancel-invitation')

  const membership = await getMembership({
    organizationSlug,
  })

  if (!membership?.isAdmin) {
    return []
  }

  const pendingInvitations = await queries.ctx.listPendingInvitations({
    organizationId: membership.organizationId,
  })

  return pendingInvitations
}
