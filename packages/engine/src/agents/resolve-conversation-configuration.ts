import type { ToolSet } from '@workspace/ai'
import type { AIMessage } from '@workspace/ai/types'
import { db } from '@workspace/db'
import { aliasedTable, eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentConfigurations, conversations } from '@workspace/db/schema'
import { type PartialMessage, processMessages } from './process-messages'
import { resolveAgentConfiguration } from './resolve-agent-configuration'
import { resolveLanguageModelSettings } from './resolve-model-settings'

export type ConversationConfiguration = Awaited<
  ReturnType<typeof resolveConversationConfiguration>
>

export async function resolveConversationConfiguration(params: {
  conversationId: string
}) {
  const conversationConfigurations = aliasedTable(
    agentConfigurations,
    'conversation_configurations',
  )

  let [conversationConfiguration] = await db
    .select({
      id: conversationConfigurations.id,
      languageModelSettingsId:
        conversationConfigurations.languageModelSettingsId,
      systemMessage: conversationConfigurations.systemMessage,
      promptMessages: conversationConfigurations.promptMessages,
      enableKnowledgeBaseTool:
        conversationConfigurations.enableKnowledgeBaseTool,
      agentId: conversations.agentId,
    })
    .from(conversations)
    .leftJoin(
      conversationConfigurations,
      eq(conversations.id, conversationConfigurations.conversationId),
    )
    .where(eq(conversations.id, params.conversationId))
    .limit(1)

  if (!conversationConfiguration) {
    const conversation = await queries.getConversation({
      conversationId: params.conversationId,
    })

    if (!conversation) {
      return null
    }

    const [createdConversationConfiguration] = await db
      .insert(conversationConfigurations)
      .values({
        conversationId: conversation.id,
      })
      .returning({
        id: conversationConfigurations.id,
        languageModelSettingsId:
          conversationConfigurations.languageModelSettingsId,
        systemMessage: conversationConfigurations.systemMessage,
        promptMessages: conversationConfigurations.promptMessages,
        enableKnowledgeBaseTool:
          conversationConfigurations.enableKnowledgeBaseTool,
      })

    if (!createdConversationConfiguration) {
      return null
    }

    conversationConfiguration = {
      ...createdConversationConfiguration,
      agentId: conversation.agentId,
    }
  }

  const agentConfiguration = await resolveAgentConfiguration({
    agentId: conversationConfiguration.agentId,
  })

  if (!agentConfiguration) {
    return null
  }

  const languageModelSettingsId =
    conversationConfiguration.languageModelSettingsId ??
    agentConfiguration.languageModelSettingsId ??
    null

  const systemMessage =
    conversationConfiguration.systemMessage ??
    agentConfiguration.systemMessage ??
    ''
  const promptMessages =
    conversationConfiguration.promptMessages ??
    agentConfiguration.promptMessages ??
    []

  const enableKnowledgeBaseTool =
    conversationConfiguration.enableKnowledgeBaseTool ??
    agentConfiguration.enableKnowledgeBaseTool ??
    false

  // TODO: make this dynamic based on the agent's configuration
  const shortTermMemory = true
  const windowSize = 100

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
    if (!shortTermMemory) {
      return []
    }

    const listMessageNodes = await queries.listMessageParentNodes({
      conversationId: params.conversationId,
      targetMessageId,
      limit: windowSize,
    })

    return listMessageNodes.map(({ id, status, role, parts, metadata }) => ({
      id,
      status,
      role,
      parts: parts?.length ? parts : [{ type: 'text' as const, text: '' }],
      metadata: metadata ?? undefined,
    }))
  }

  const processedMessages = async ({
    message,
  }: {
    message: PartialMessage
  }) => {
    const [_prompts, _messages] = await Promise.all([
      prompts(),
      messages({ targetMessageId: message.id }),
    ])

    return await processMessages({
      messages: [..._prompts, ..._messages],
      lastMessage: message,
    })
  }

  const createMcpClients = async () => {
    await agentConfiguration.createMcpClients()
  }

  const closeMcpClients = async () => {
    await agentConfiguration.closeMcpClients()
  }

  const mcpTools = async (): Promise<ToolSet> => {
    return await agentConfiguration.mcpTools()
  }

  const activeTools = async () => {
    return await agentConfiguration.activeTools({
      enableKnowledgeBaseTool,
    })
  }

  const tools = async (): Promise<ToolSet> => {
    return await agentConfiguration.tools({ enableKnowledgeBaseTool })
  }

  return {
    agentId: conversationConfiguration.agentId,
    languageModelSettingsId,
    systemMessage,
    promptMessages,
    enableKnowledgeBaseTool,
    languageModelSettings,
    languageModel,
    prompts,
    messages,
    processedMessages,
    createMcpClients,
    closeMcpClients,
    mcpTools,
    activeTools,
    tools,
    agentConfiguration,
  }
}
