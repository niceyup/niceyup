import { resumableStreamContext } from '@/lib/resumable-stream'
import { stepCountIs } from '@workspace/ai'
import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
} from '@workspace/ai/types'
import { queries } from '@workspace/db/queries'
import { createAgentAIStream } from '@workspace/engine'
import { InvalidArgumentError } from '@workspace/engine'
import {
  type ConversationConfiguration,
  resolveConversationConfiguration,
} from '@workspace/engine/agents'
import throttle from 'throttleit'

export async function streamAgentResponse({
  streamId,
  conversationId,
  userMessage,
  assistantMessage,
}: {
  streamId: string
  conversationId: string
} & (
  | {
      userMessage: {
        id: string
        parts: AIMessagePart[]
      }
      assistantMessage: {
        id: string
        metadata?: AIMessageMetadata | null
      }
    }
  | {
      userMessage?: never
      assistantMessage: {
        id: string
        parts: AIMessagePart[]
        metadata?: AIMessageMetadata | null
      }
    }
)) {
  const stream = new ReadableStream({
    async start(controller) {
      // If user message is not provided, we are updating the assistant message
      const isUpdating = !userMessage

      const enqueue = (chunk: AIMessage) =>
        controller.enqueue(`${JSON.stringify(chunk)}\n\n`)

      enqueue({
        id: assistantMessage.id,
        metadata: assistantMessage.metadata ?? undefined,
        status: 'queued',
        role: 'assistant',
        parts: isUpdating ? assistantMessage.parts : [],
      })

      let conversationConfiguration: ConversationConfiguration | undefined

      try {
        conversationConfiguration = await resolveConversationConfiguration({
          conversationId,
        })

        if (!conversationConfiguration) {
          throw new InvalidArgumentError({
            code: 'CONVERSATION_CONFIGURATION_NOT_FOUND',
            message: 'Conversation configuration not found',
          })
        }

        const [languageModel, activeTools, tools, mcpTools, processedMessages] =
          await Promise.all([
            conversationConfiguration.languageModel(),
            conversationConfiguration.activeTools(),
            conversationConfiguration.tools(),
            conversationConfiguration
              .createMcpClients()
              .then(conversationConfiguration.mcpTools),
            conversationConfiguration.processedMessages({
              message: isUpdating
                ? { ...assistantMessage, role: 'assistant' }
                : { ...userMessage, role: 'user' },
            }),
          ])

        const stopSignal = new AbortController()

        // throttle reading from chat store to max once per second
        const checkCancellationSignal = throttle(async () => {
          const message = await queries.getMessage({
            messageId: assistantMessage.id,
          })

          if (message?.status === 'cancelled') {
            stopSignal.abort()
          }
        }, 1000)

        await createAgentAIStream({
          model: languageModel.model,
          tools: { ...tools, ...mcpTools },
          activeTools,
          stopWhen: stepCountIs(5),
          abortSignal: stopSignal.signal,
          messages: processedMessages,

          originalMessage: assistantMessage,

          onStart: async ({ message }) => {
            enqueue(message)

            await queries.updateMessage({
              messageId: message.id,
              status: message.status,
            })
          },
          onChunk: async ({ message }) => {
            enqueue(message)

            checkCancellationSignal()
          },
          onFinish: async ({ message }) => {
            enqueue(message)

            await Promise.all([
              conversationConfiguration?.closeMcpClients(),
              queries.updateMessage({
                messageId: message.id,
                metadata: message.metadata,
                status: message.status,
                parts: message.parts,
              }),
            ])
          },
          onFailed: async ({ message }) => {
            enqueue(message)

            await Promise.all([
              conversationConfiguration?.closeMcpClients(),
              queries.updateMessage({
                messageId: message.id,
                metadata: message.metadata,
                status: message.status,
                parts: message.parts,
              }),
            ])
          },
        })
      } catch (error) {
        const failedAssistantMessage = {
          metadata: {
            ...assistantMessage.metadata,
            error,
          },
          status: 'failed' as const,
          role: 'assistant' as const,
          parts: isUpdating ? assistantMessage.parts : [],
        }

        enqueue({
          id: assistantMessage.id,
          ...failedAssistantMessage,
        })

        await Promise.all([
          conversationConfiguration?.closeMcpClients(),
          queries.updateMessage({
            messageId: assistantMessage.id,
            ...failedAssistantMessage,
          }),
        ])
      } finally {
        controller.close()
      }
    },
  })

  await resumableStreamContext.createNewResumableStream(streamId, () => stream)
}
