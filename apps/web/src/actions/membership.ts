'use server'

import { authenticatedUser } from '@/lib/auth/server'
import type { OrganizationTeamParams } from '@/lib/types'
import { queries } from '@workspace/db/queries'
import { cache } from 'react'

type GetMembershipParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export const getMembership = cache(
  async ({ organizationSlug }: GetMembershipParams) => {
    const {
      user: { id: userId },
    } = await authenticatedUser()

    const membership = await queries.context.getMembership({
      userId,
      organizationSlug,
    })

    return membership
  },
)

type IsOrganizationMemberAdminParams = { userId?: string } & (
  | {
      organizationSlug: OrganizationTeamParams['organizationSlug']
      organizationId?: never
    }
  | {
      organizationSlug?: never
      organizationId: string
    }
)

export const isOrganizationMemberAdmin = cache(
  async ({
    userId,
    organizationSlug,
    organizationId,
  }: IsOrganizationMemberAdminParams) => {
    const isAdmin = await queries.context.isOrganizationMemberAdmin({
      userId: userId || (await authenticatedUser()).user.id,
      ...(organizationSlug ? { organizationSlug } : { organizationId }),
    })

    return isAdmin
  },
)
