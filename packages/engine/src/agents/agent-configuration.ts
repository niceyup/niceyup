import type { ToolSet } from '@workspace/ai'
import { openai } from '@workspace/ai/providers'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { agents, conversations } from '@workspace/db/schema'
import { retrieveSourcesTool } from '@workspace/engine'
import { toEmbeddingModel, toLanguageModel } from './to-model'

type GetAgentConfigurationParams =
  | {
      agentId: string
      conversationId: string
    }
  | {
      agentId: string
      conversationId?: string
    }
  | {
      agentId?: string
      conversationId: string
    }

export async function getAgentConfiguration(
  params: GetAgentConfigurationParams,
) {
  let agentConfiguration = null
  let conversationConfiguration = null

  if (params.conversationId) {
    const [conversation] = await db
      .select({
        agentId: conversations.agentId,
        languageModelId: conversations.languageModelId,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, params.conversationId),
          params.agentId
            ? eq(conversations.agentId, params.agentId)
            : undefined,
        ),
      )

    conversationConfiguration = conversation
  }

  const agentId = params.agentId || conversationConfiguration?.agentId

  if (agentId) {
    const [agent] = await db
      .select({
        organizationId: agents.organizationId,
        languageModelId: agents.languageModelId,
        embeddingModelId: agents.embeddingModelId,
        systemMessage: agents.systemMessage,
        promptMessages: agents.promptMessages,
        suggestions: agents.suggestions,
      })
      .from(agents)
      .where(eq(agents.id, agentId))

    agentConfiguration = agent
  }

  const [languageModel, embeddingModel] = await Promise.all([
    toLanguageModel({
      modelId:
        conversationConfiguration?.languageModelId ||
        agentConfiguration?.languageModelId,
    }),
    toEmbeddingModel({
      modelId: agentConfiguration?.embeddingModelId,
    }),
  ])

  const namespace = agentConfiguration?.organizationId

  // TODO: make this dynamic based on the agent's configuration
  const activeTools = ['image_generation', 'retrieve_sources']
  const contextMessages = true
  const maxContextMessages = 100

  let tools: ToolSet | undefined = undefined

  if (activeTools.length) {
    tools = {}

    if (
      languageModel?.provider === 'openai' &&
      activeTools.includes('image_generation')
    ) {
      tools.image_generation = openai.tools.imageGeneration()
    }

    if (namespace && activeTools.includes('retrieve_sources')) {
      tools.retrieve_sources = retrieveSourcesTool({ namespace })
    }
  }

  return {
    agentId,

    languageModel,
    embeddingModel,
    tools,

    systemMessage: agentConfiguration?.systemMessage,
    promptMessages: agentConfiguration?.promptMessages,
    suggestions: agentConfiguration?.suggestions,

    contextMessages,
    maxContextMessages,
  }
}
