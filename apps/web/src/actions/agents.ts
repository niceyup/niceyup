'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
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

  const ctx = await resolveOrganizationContext({ userId, ...params })

  if (!ctx) {
    return []
  }

  const agents = await queries.context.listAgents(ctx)

  return agents
}
