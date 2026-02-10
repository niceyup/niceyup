'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
import type { AgentParams } from '@/lib/types'
import { queries } from '@workspace/db/queries'
import { resolveAgentConfiguration } from '@workspace/engine/agents'
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

type EnableSourceRetrievalToolParams = {
  agentId: AgentParams['agentId']
}

export async function enableSourceRetrievalTool(
  params: EnableSourceRetrievalToolParams,
) {
  const agentConfiguration = await resolveAgentConfiguration({
    agentId: params.agentId,
  })

  return agentConfiguration?.enableSourceRetrievalTool || false
}
