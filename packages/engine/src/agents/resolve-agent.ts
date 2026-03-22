import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { agents } from '@workspace/db/schema'
import {
  type AgentConfiguration,
  resolveAgentConfiguration,
} from './resolve-agent-configuration'
import {
  type AgentKnowledgeBase,
  resolveAgentKnowledgeBase,
} from './resolve-agent-knowledge-base'
import {
  type AgentSystemConfiguration,
  resolveAgentSystemConfiguration,
} from './resolve-agent-system-configuration'
import {
  type ConversationConfiguration,
  resolveConversationConfiguration,
} from './resolve-conversation-configuration'

export type Agent = Awaited<ReturnType<typeof resolveAgent>>

export async function resolveAgent(params: {
  agentId: string
}) {
  const [agent] = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      logo: agents.logo,
      description: agents.description,
      tags: agents.tags,
      published: agents.published,
    })
    .from(agents)
    .where(eq(agents.id, params.agentId))
    .limit(1)

  if (!agent) {
    return null
  }

  let cachedSystemConfiguration: AgentSystemConfiguration | undefined

  const systemConfiguration = async () => {
    if (!cachedSystemConfiguration) {
      cachedSystemConfiguration = await resolveAgentSystemConfiguration({
        agentId: params.agentId,
      })
    }

    return cachedSystemConfiguration
  }

  let cachedConfiguration: AgentConfiguration | undefined

  const configuration = async () => {
    if (!cachedConfiguration) {
      cachedConfiguration = await resolveAgentConfiguration({
        agentId: params.agentId,
      })
    }

    return cachedConfiguration
  }

  let cachedKnowledgeBase: AgentKnowledgeBase | undefined

  const knowledgeBase = async () => {
    if (!cachedKnowledgeBase) {
      cachedKnowledgeBase = await resolveAgentKnowledgeBase({
        agentId: params.agentId,
      })
    }

    return cachedKnowledgeBase
  }

  let cachedConversationConfiguration: ConversationConfiguration | undefined

  const conversationConfiguration = async (params: {
    conversationId: string
  }) => {
    if (!cachedConversationConfiguration) {
      cachedConversationConfiguration = await resolveConversationConfiguration({
        conversationId: params.conversationId,
      })
    }

    return cachedConversationConfiguration
  }

  return {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    logo: agent.logo,
    description: agent.description,
    tags: agent.tags,
    published: agent.published,
    systemConfiguration,
    configuration,
    knowledgeBase,
    conversationConfiguration,
  }
}
