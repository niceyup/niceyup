import type { ModelMessage, ToolSet } from '@workspace/ai'
import { openai } from '@workspace/ai/providers'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { agents, conversations } from '@workspace/db/schema'
import { retrieveSourcesTool } from '@workspace/engine'
import {
  resolveEmbeddingModelSettings,
  resolveLanguageModelSettings,
} from './resolve-model-settings'

export async function resolveAgentConfiguration(
  params:
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
      },
) {
  let agentConfiguration = null
  let conversationConfiguration = null

  if (params.conversationId) {
    const [conversation] = await db
      .select({
        agentId: conversations.agentId,
        languageModelSettingsId: conversations.languageModelSettingsId,
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
        id: agents.id,
        organizationId: agents.organizationId,
        languageModelSettingsId: agents.languageModelSettingsId,
        embeddingModelSettingsId: agents.embeddingModelSettingsId,
        systemMessage: agents.systemMessage,
        promptMessages: agents.promptMessages,
        suggestions: agents.suggestions,
      })
      .from(agents)
      .where(eq(agents.id, agentId))

    agentConfiguration = agent
  }

  const [languageModel, embeddingModel] = await Promise.all([
    resolveLanguageModelSettings({
      modelSettingsId:
        conversationConfiguration?.languageModelSettingsId ||
        agentConfiguration?.languageModelSettingsId,
    }),
    resolveEmbeddingModelSettings({
      modelSettingsId: agentConfiguration?.embeddingModelSettingsId,
    }),
  ])

  // TODO: make this dynamic based on the agent's configuration
  const activeTools = ['image_generation', 'retrieve_sources']
  const contextMessages = true
  const maxContextMessages = 100

  let tools: ToolSet | undefined = undefined

  if (activeTools.length) {
    tools = {}

    if (languageModel?.provider === 'openai') {
      if (activeTools.includes('image_generation')) {
        tools.image_generation = openai.tools.imageGeneration()
      }

      // TODO: add other tools here
    }

    if (agentConfiguration?.organizationId) {
      if (embeddingModel) {
        tools.retrieve_sources = retrieveSourcesTool({
          embeddingModel: embeddingModel.model,
          agentId: agentConfiguration.id,
          organizationId: agentConfiguration.organizationId,
          topK: 20,
        })

        // TODO: add other tools here
      }

      // TODO: add other tools here
    }

    // TODO: add other tools here
  }

  const prompts: ModelMessage[] = []

  if (agentConfiguration?.systemMessage) {
    prompts.push({
      role: 'system',
      content: agentConfiguration.systemMessage,
    })
  }

  if (agentConfiguration?.promptMessages) {
    prompts.push(
      ...agentConfiguration.promptMessages.map((promptMessage) => ({
        role: promptMessage.role,
        content: promptMessage.content,
      })),
    )
  }

  return {
    agentId,

    languageModel,
    embeddingModel,
    tools,
    activeTools,
    prompts,

    systemMessage: agentConfiguration?.systemMessage,
    promptMessages: agentConfiguration?.promptMessages,
    suggestions: agentConfiguration?.suggestions,

    contextMessages,
    maxContextMessages,
  }
}
