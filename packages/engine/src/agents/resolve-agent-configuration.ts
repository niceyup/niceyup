import type { ModelMessage, ToolSet } from '@workspace/ai'
import { openai } from '@workspace/ai/providers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agents } from '@workspace/db/schema'
import { retrieveSourcesTool } from '@workspace/engine'
import {
  resolveEmbeddingModelSettings,
  resolveLanguageModelSettings,
} from './resolve-model-settings'

export async function resolveAgentConfiguration(params: {
  agentId: string
}) {
  const [agentConfiguration] = await db
    .select({
      id: agents.id,
      organizationId: agents.organizationId,
      languageModelSettingsId: agents.languageModelSettingsId,
      embeddingModelSettingsId: agents.embeddingModelSettingsId,
      systemMessage: agents.systemMessage,
      promptMessages: agents.promptMessages,
      suggestions: agents.suggestions,
      enableSourceRetrievalTool: agents.enableSourceRetrievalTool,
    })
    .from(agents)
    .where(eq(agents.id, params.agentId))
    .limit(1)

  if (!agentConfiguration) {
    return null
  }

  const languageModelSettingsId =
    agentConfiguration.languageModelSettingsId || null

  const embeddingModelSettingsId =
    agentConfiguration.embeddingModelSettingsId || null

  const systemMessage = agentConfiguration.systemMessage || ''

  const promptMessages = agentConfiguration.promptMessages || []

  const suggestions = agentConfiguration.suggestions || []

  const enableSourceRetrievalTool = agentConfiguration.enableSourceRetrievalTool

  // TODO: make this dynamic based on the agent's configuration
  const topK = 20

  const prompts: ModelMessage[] = [
    { role: 'system', content: systemMessage },
    ...promptMessages.map(({ role, content }) => ({ role, content })),
  ]

  const languageModelSettings = async () => {
    if (!languageModelSettingsId) {
      return null
    }

    return await queries.getModelSettings({
      type: 'language-model',
      modelSettingsId: languageModelSettingsId,
    })
  }

  const embeddingModelSettings = async () => {
    if (!embeddingModelSettingsId) {
      return null
    }

    return await queries.getModelSettings({
      type: 'embedding-model',
      modelSettingsId: embeddingModelSettingsId,
    })
  }

  const languageModel = async () => {
    return await resolveLanguageModelSettings({
      modelSettingsId: languageModelSettingsId,
    })
  }

  const embeddingModel = async () => {
    return await resolveEmbeddingModelSettings({
      modelSettingsId: embeddingModelSettingsId,
    })
  }

  const activeTools = async () => {
    const activeTools = ['image_generation', 'web_search']

    if (enableSourceRetrievalTool) {
      activeTools.push('retrieve_sources')
    }

    return activeTools
  }

  const tools = async (): Promise<ToolSet | undefined> => {
    const _activeTools = await activeTools()

    let tools: ToolSet | undefined = undefined

    if (_activeTools.length) {
      tools = {}

      const _languageModel = await languageModel()

      if (_languageModel.provider === 'openai') {
        if (_activeTools.includes('image_generation')) {
          tools.image_generation = openai.tools.imageGeneration()
        }

        if (_activeTools.includes('web_search')) {
          tools.web_search = openai.tools.webSearch()
        }
      }

      if (_activeTools.includes('retrieve_sources')) {
        const _embeddingModel = await embeddingModel()

        tools.retrieve_sources = retrieveSourcesTool({
          embeddingModel: _embeddingModel.model,
          agentId: agentConfiguration.id,
          organizationId: agentConfiguration.organizationId!,
          topK,
        })
      }
    }

    return tools
  }

  return {
    languageModelSettingsId,
    embeddingModelSettingsId,
    systemMessage,
    promptMessages,
    suggestions,
    enableSourceRetrievalTool,
    prompts,
    languageModelSettings,
    embeddingModelSettings,
    languageModel,
    embeddingModel,
    activeTools,
    tools,
  }
}
