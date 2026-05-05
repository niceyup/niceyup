'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { queries } from '@workspace/db/queries'
import { cache } from 'react'

type GetMembershipParams =
  | {
      organizationSlug: string
      organizationId?: never
    }
  | {
      organizationSlug?: never
      organizationId: string
    }

export const getMembership = cache(
  async ({ organizationSlug, organizationId }: GetMembershipParams) => {
    const { user } = await authenticatedUser()

    const membership = await queries.ctx.getMembership({
      userId: user.id,
      ...(organizationSlug !== undefined
        ? { organizationSlug }
        : { organizationId }),
    })

    return membership
  },
)

type GetMembershipRoleParams = {
  userId?: string
} & (
  | {
      organizationSlug: string
      organizationId?: never
    }
  | {
      organizationSlug?: never
      organizationId: string
    }
)

export const getMembershipRole = cache(
  async ({
    userId,
    organizationSlug,
    organizationId,
  }: GetMembershipRoleParams) => {
    let _userId = userId

    if (!_userId) {
      const { user } = await authenticatedUser()

      _userId = user.id
    }

    const membershipRole = await queries.ctx.getMembershipRole({
      userId: _userId,
      ...(organizationSlug !== undefined
        ? { organizationSlug }
        : { organizationId }),
    })

    return membershipRole
  },
)
