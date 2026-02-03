import type { ToolSet } from '@workspace/ai'
import type { AIMessage } from '@workspace/ai/types'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agents, conversations } from '@workspace/db/schema'
import { resolveAgentConfiguration } from './resolve-agent-configuration'
import { resolveLanguageModelSettings } from './resolve-model-settings'

export async function resolveConversationConfiguration(params: {
  conversationId: string
}) {
  const [conversationConfiguration] = await db
    .select({
      languageModelSettingsId: conversations.languageModelSettingsId,
      systemMessage: conversations.systemMessage,
      promptMessages: conversations.promptMessages,
      agent: {
        id: agents.id,
        languageModelSettingsId: agents.languageModelSettingsId,
        systemMessage: agents.systemMessage,
        promptMessages: agents.promptMessages,
      },
    })
    .from(conversations)
    .leftJoin(agents, eq(conversations.agentId, agents.id))
    .where(eq(conversations.id, params.conversationId))
    .limit(1)

  if (!conversationConfiguration) {
    return null
  }

  const languageModelSettingsId =
    conversationConfiguration.languageModelSettingsId ||
    conversationConfiguration.agent?.languageModelSettingsId ||
    null

  const systemMessage =
    conversationConfiguration.systemMessage ||
    conversationConfiguration.agent?.systemMessage ||
    ''
  const promptMessages =
    conversationConfiguration.promptMessages ||
    conversationConfiguration.agent?.promptMessages ||
    []

  // TODO: make this dynamic based on the agent's configuration
  const contextMessages = true
  const maxContextMessages = 100

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

  const prompts = async (): Promise<AIMessage[]> => {
    const metadata = undefined

    return [
      ...[
        {
          id: 'system-message',
          status: 'completed' as const,
          role: 'system' as const,
          parts: [{ type: 'text' as const, text: systemMessage }],
          metadata,
        },
      ],

      ...promptMessages.map(({ role, content }, index) => ({
        id: `prompt-message-${index}`,
        status: 'completed' as const,
        role,
        parts: [{ type: 'text' as const, text: content }],
        metadata,
      })),
    ]
  }

  const messages = async ({
    targetMessageId,
  }: {
    targetMessageId: string
  }): Promise<AIMessage[]> => {
    if (!contextMessages) {
      return []
    }

    const listMessageNodes = await queries.listMessageParentNodes({
      conversationId: params.conversationId,
      targetMessageId,
      limit: maxContextMessages,
    })

    return listMessageNodes.map(({ id, status, role, parts, metadata }) => ({
      id,
      status,
      role,
      parts: parts?.length ? parts : [{ type: 'text' as const, text: '' }],
      metadata: metadata ?? undefined,
    }))
  }

  const activeTools = async () => {
    if (!conversationConfiguration.agent?.id) {
      return []
    }

    const agentConfiguration = await resolveAgentConfiguration({
      agentId: conversationConfiguration.agent.id,
    })

    return (await agentConfiguration?.activeTools()) || []
  }

  const tools = async (): Promise<ToolSet | undefined> => {
    if (!conversationConfiguration.agent?.id) {
      return
    }

    const agentConfiguration = await resolveAgentConfiguration({
      agentId: conversationConfiguration.agent.id,
    })

    return await agentConfiguration?.tools()
  }

  return {
    languageModelSettingsId,
    systemMessage,
    promptMessages,
    languageModelSettings,
    languageModel,
    prompts,
    messages,
    activeTools,
    tools,
  }
}
