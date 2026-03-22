'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { queries } from '@workspace/db/queries'
import {
  resolveAgentConfiguration,
  resolveAgentKnowledgeBase,
  resolveAgentSystemConfiguration,
} from '@workspace/engine/agents'
import { cacheTag } from 'next/cache'

type ListAgentsParams = {
  organizationId?: string | null
}

export async function listAgents({ organizationId }: ListAgentsParams) {
  'use cache: private'
  cacheTag('update-agent', 'delete-agent')

  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await resolveOrganizationContext({ userId, organizationId })

  if (!ctx) {
    return []
  }

  const agents = await queries.context.listAgents(ctx)

  return agents
}

type ContextGetAgentParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

type GetAgentWithParams = {
  systemConfiguration?: boolean
  configuration?: boolean
  knowledgeBase?: boolean
}

type GetAgentParams<WithParams extends GetAgentWithParams> = {
  with?: WithParams
}

export async function getAgent<WithParams extends GetAgentWithParams>(
  context: ContextGetAgentParams,
  params: GetAgentParams<WithParams> = {},
) {
  'use cache: private'
  cacheTag(
    'update-agent',
    'update-agent-system-configuration',
    'update-agent-configuration',
    'update-agent-knowledge-base',
  )

  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await resolveOrganizationContext({ userId, ...context })

  if (!ctx) {
    return null
  }

  const agent = await queries.context.getAgent(ctx, {
    agentId: context.agentId,
  })

  if (!agent) {
    return null
  }
  const [agentSystemConfiguration, agentConfiguration, agentKnowledgeBase] =
    await Promise.all([
      params.with?.systemConfiguration
        ? resolveAgentSystemConfiguration(context)
        : null,
      params.with?.configuration ? resolveAgentConfiguration(context) : null,
      params.with?.knowledgeBase ? resolveAgentKnowledgeBase(context) : null,
    ])

  const [
    auxiliaryLanguageModelSettings,
    languageModelSettings,
    vectorStore,
    embeddingModelSettings,
    validatedConfiguration,
  ] = await Promise.all([
    agentSystemConfiguration?.auxiliaryLanguageModelSettings(),
    agentConfiguration?.languageModelSettings(),
    agentKnowledgeBase?.vectorStore(),
    agentKnowledgeBase?.embeddingModelSettings(),
    agentKnowledgeBase?.safeValidateConfiguration(),
  ])

  const systemConfiguration = agentSystemConfiguration
    ? {
        auxiliaryLanguageModelSettings: auxiliaryLanguageModelSettings ?? null,
        titleGenerationSystemMessage:
          agentSystemConfiguration.titleGenerationSystemMessage,
        suggestions: agentSystemConfiguration.suggestions,
      }
    : null

  const configuration = agentConfiguration
    ? {
        languageModelSettings: languageModelSettings ?? null,
        systemMessage: agentConfiguration.systemMessage,
        promptMessages: agentConfiguration.promptMessages,
        enableKnowledgeBaseTool: agentConfiguration.enableKnowledgeBaseTool,
      }
    : null

  const knowledgeBase = agentKnowledgeBase
    ? {
        status: agentKnowledgeBase.status,
        vectorStore: vectorStore ?? null,
        embeddingModelSettings: embeddingModelSettings ?? null,
        topK: agentKnowledgeBase.topK,
        isConfigured: validatedConfiguration?.success === true,
      }
    : null

  return {
    ...agent,
    systemConfiguration,
    configuration,
    knowledgeBase,
  } as unknown as typeof agent &
    (WithParams extends { systemConfiguration: true }
      ? { systemConfiguration: typeof systemConfiguration }
      : unknown) &
    (WithParams extends { configuration: true }
      ? { configuration: typeof configuration }
      : unknown) &
    (WithParams extends { knowledgeBase: true }
      ? { knowledgeBase: typeof knowledgeBase & { isConfigured: boolean } }
      : unknown)
}
