'use server'

import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { queries } from '@workspace/db/queries'
import {
  resolveAgentConfiguration,
  resolveAgentKnowledgeBase,
  resolveAgentSystemConfiguration,
} from '@workspace/engine/agents'
import { cacheTag } from 'next/cache'
import { getMembership } from './membership'

type ListAgentsParams = {
  organizationId?: string | null
}

export async function listAgents({ organizationId }: ListAgentsParams) {
  'use cache: private'
  cacheTag('update-agent', 'delete-agent')

  if (!organizationId) {
    return []
  }

  const membership = await getMembership({
    organizationId,
  })

  if (!membership) {
    return []
  }

  const agents = await queries.ctx.listAgents({
    organizationId: membership.organizationId,
  })

  return agents
}

type ContextGetAgentParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export async function getAgent(context: ContextGetAgentParams) {
  'use cache: private'
  cacheTag('update-agent')

  const membership = await getMembership({
    organizationSlug: context.organizationSlug,
  })

  if (!membership) {
    return null
  }

  const agent = await queries.ctx.getAgent(
    { organizationId: membership.organizationId },
    { agentId: context.agentId },
  )

  return agent
}

type ContextGetAgentDetailedParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

type GetAgentDetailedWithParams = {
  systemConfiguration?: boolean
  configuration?: boolean
  knowledgeBase?: boolean
}

type GetAgentDetailedParams<WithParams extends GetAgentDetailedWithParams> = {
  with?: WithParams
}

export async function getAgentDetailed<
  WithParams extends GetAgentDetailedWithParams,
>(
  context: ContextGetAgentDetailedParams,
  params: GetAgentDetailedParams<WithParams> = {},
) {
  'use cache: private'
  cacheTag(
    'update-agent',
    'update-agent-system-configuration',
    'update-agent-configuration',
    'update-agent-knowledge-base',
  )

  const membership = await getMembership({
    organizationSlug: context.organizationSlug,
  })

  if (!membership?.isAdmin) {
    return null
  }

  const agent = await queries.ctx.getAgent(
    { organizationId: membership.organizationId },
    { agentId: context.agentId },
  )

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

  if (
    (params.with?.systemConfiguration && !agentSystemConfiguration) ||
    (params.with?.configuration && !agentConfiguration) ||
    (params.with?.knowledgeBase && !agentKnowledgeBase)
  ) {
    return null
  }

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

  let systemConfiguration = undefined
  let configuration = undefined
  let knowledgeBase = undefined

  if (agentSystemConfiguration) {
    systemConfiguration = {
      auxiliaryLanguageModelSettings: auxiliaryLanguageModelSettings ?? null,
      titleGenerationSystemMessage:
        agentSystemConfiguration.titleGenerationSystemMessage,
      suggestions: agentSystemConfiguration.suggestions,
    }
  }

  if (agentConfiguration) {
    configuration = {
      languageModelSettings: languageModelSettings ?? null,
      systemMessage: agentConfiguration.systemMessage,
      promptMessages: agentConfiguration.promptMessages,
      enableKnowledgeBaseTool: agentConfiguration.enableKnowledgeBaseTool,
    }
  }

  if (agentKnowledgeBase) {
    knowledgeBase = {
      status: agentKnowledgeBase.status,
      vectorStore: vectorStore ?? null,
      embeddingModelSettings: embeddingModelSettings ?? null,
      topK: agentKnowledgeBase.topK,
      isConfigured: validatedConfiguration?.success === true,
    }
  }

  return {
    ...agent,
    systemConfiguration,
    configuration,
    knowledgeBase,
  } as unknown as typeof agent &
    (WithParams extends { systemConfiguration: true }
      ? { systemConfiguration: NonNullable<typeof systemConfiguration> }
      : unknown) &
    (WithParams extends { configuration: true }
      ? { configuration: NonNullable<typeof configuration> }
      : unknown) &
    (WithParams extends { knowledgeBase: true }
      ? { knowledgeBase: NonNullable<typeof knowledgeBase> }
      : unknown)
}
