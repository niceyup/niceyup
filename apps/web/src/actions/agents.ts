'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { getOrganizationContext } from '@/lib/organization-context'
import { queries } from '@workspace/db/queries'
import { cacheTag } from 'next/cache'

type ListAgentsParams = {
  organizationId?: string | null
}

export async function listAgents(params: ListAgentsParams) {
  'use cache: private'
  cacheTag('update-agent', 'delete-agent')

  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await getOrganizationContext({ userId, ...params })

  if (!ctx) {
    return []
  }

  const agents = await queries.context.listAgents(ctx)

  return agents
}
