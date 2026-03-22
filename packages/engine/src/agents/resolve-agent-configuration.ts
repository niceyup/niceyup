import {
  type MCPClient,
  type ModelMessage,
  type ToolSet,
  createMCPClient,
} from '@workspace/ai'
import type { ModelProvider } from '@workspace/core/model-providers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentConfigurations } from '@workspace/db/schema'
import { modelProviderTools } from '../model-provider-tools'
import {
  type AgentKnowledgeBase,
  resolveAgentKnowledgeBase,
} from './resolve-agent-knowledge-base'
import { resolveLanguageModelSettings } from './resolve-model-settings'

type ActiveTool = Awaited<ReturnType<typeof queries.listActiveTools>>[number]

export type AgentConfiguration = Awaited<
  ReturnType<typeof resolveAgentConfiguration>
>

export async function resolveAgentConfiguration(params: {
  agentId: string
}) {
  const [agentConfiguration] = await db
    .select({
      id: agentConfigurations.id,
      languageModelSettingsId: agentConfigurations.languageModelSettingsId,
      systemMessage: agentConfigurations.systemMessage,
      promptMessages: agentConfigurations.promptMessages,
      enableKnowledgeBaseTool: agentConfigurations.enableKnowledgeBaseTool,
    })
    .from(agentConfigurations)
    .where(eq(agentConfigurations.agentId, params.agentId))
    .limit(1)

  if (!agentConfiguration) {
    return null
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

  const languageModelSettingsId =
    agentConfiguration.languageModelSettingsId ?? null

  const systemMessage = agentConfiguration.systemMessage ?? ''

  const promptMessages = agentConfiguration.promptMessages ?? []

  const enableKnowledgeBaseTool =
    agentConfiguration.enableKnowledgeBaseTool ?? false

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

  const languageModel = async () => {
    return await resolveLanguageModelSettings({
      modelSettingsId: languageModelSettingsId,
    })
  }

  const mcpClients = new Map<string, MCPClient>()

  const createMcpClients = async () => {
    const listMcpServers = await queries.listMcpServersByAgentConfigurationId({
      agentConfigurationId: agentConfiguration.id,
    })

    await Promise.all(
      listMcpServers.map(async (mcpServer) => {
        const mcpClient = await createMCPClient({
          transport: {
            type: mcpServer.type,
            url: mcpServer.url,
            headers: {
              ...(mcpServer.credentials?.apiKey
                ? { Authorization: `Bearer ${mcpServer.credentials.apiKey}` }
                : {}),
              ...mcpServer.headers,
            },
          },
        })

        mcpClients.set(mcpServer.id, mcpClient)
      }),
    )
  }

  const closeMcpClients = async () => {
    await Promise.all(
      Array.from(mcpClients.values()).map((mcpClient) => mcpClient.close()),
    )
  }

  const mcpTools = async () => {
    const mcpTools = await Promise.all(
      Array.from(mcpClients.values()).map((mcpClient) => mcpClient.tools()),
    )

    return mcpTools.reduce(
      (acc, mcpTool) => Object.assign(acc, mcpTool),
      {} as ToolSet,
    )
  }

  let cachedListActiveTools:
    | {
        providerTools: ActiveTool[]
        mcpTools: (ActiveTool & { mcpServerId: string })[]
      }
    | undefined

  const listActiveTools = async () => {
    if (!cachedListActiveTools) {
      const _listActiveTools = await queries.listActiveTools({
        agentConfigurationId: agentConfiguration.id,
      })

      const providerTools = []
      const mcpTools = []

      for (const activeTool of _listActiveTools) {
        // Provider Tools
        if (activeTool.type === 'provider') {
          providerTools.push(activeTool)
        }

        // MCP Tools
        if (activeTool.type === 'dynamic' && activeTool.mcpServerId) {
          mcpTools.push({ ...activeTool, mcpServerId: activeTool.mcpServerId })
        }
      }

      cachedListActiveTools = { providerTools, mcpTools }
    }

    return cachedListActiveTools
  }

  const activeTools = async (params: { enableKnowledgeBaseTool?: boolean }) => {
    const { providerTools, mcpTools } = await listActiveTools()

    const activeTools = []

    // Provider Tools
    if (providerTools.length) {
      const _languageModelSettings = await languageModelSettings()
      const providerSettings = _languageModelSettings?.provider

      if (providerSettings) {
        const validProviderTools = providerTools.filter((providerTool) =>
          Boolean(
            modelProviderTools[providerSettings.provider]?.[providerTool.tool],
          ),
        )

        if (validProviderTools.length) {
          activeTools.push(
            ...validProviderTools.map((providerTool) => providerTool.tool),
          )
        }
      }
    }

    // MCP Tools
    if (mcpTools.length) {
      activeTools.push(...mcpTools.map((mcpTool) => mcpTool.tool))
    }

    // Knowledge Base Tool
    if (params.enableKnowledgeBaseTool ?? enableKnowledgeBaseTool) {
      activeTools.push('knowledge_base')
    }

    return activeTools
  }

  const tools = async (params: {
    enableKnowledgeBaseTool?: boolean
  }): Promise<ToolSet> => {
    const { providerTools } = await listActiveTools()

    const tools: ToolSet = {}

    // Provider Tools
    if (providerTools.length) {
      for (const providerTool of providerTools) {
        const [provider] = providerTool.tool.split('.')

        if (provider) {
          const toolFactory =
            modelProviderTools[provider as ModelProvider]?.[providerTool.tool]

          if (toolFactory) {
            tools[providerTool.tool] = toolFactory(providerTool.arguments ?? {})
          }
        }
      }
    }

    // // Knowledge Base Tool
    if (params.enableKnowledgeBaseTool ?? enableKnowledgeBaseTool) {
      const _knowledgeBase = await knowledgeBase()

      if (_knowledgeBase) {
        tools.knowledge_base = await _knowledgeBase.knowledgeBaseTool()
      }
    }

    return tools
  }

  return {
    languageModelSettingsId,
    systemMessage,
    promptMessages,
    enableKnowledgeBaseTool,
    prompts,
    languageModelSettings,
    languageModel,
    createMcpClients,
    closeMcpClients,
    mcpTools,
    activeTools,
    tools,
  }
}
