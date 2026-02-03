import { resumableStreamContext } from '@/lib/resumable-stream'
import {
  convertToModelMessages,
  safeValidateUIMessages,
  stepCountIs,
} from '@workspace/ai'
import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
} from '@workspace/ai/types'
import { queries } from '@workspace/db/queries'
import { createAgentAIStream } from '@workspace/engine'
import { InvalidArgumentError } from '@workspace/engine'
import { resolveConversationConfiguration } from '@workspace/engine/agents'
import throttle from 'throttleit'

export async function streamAgentResponse({
  conversationId,
  userMessage,
  assistantMessage,
}: {
  conversationId: string
  userMessage: {
    id: string
    parts: AIMessagePart[]
  }
  assistantMessage: {
    id: string
    metadata?: AIMessageMetadata | null
  }
}) {
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: AIMessage) =>
        controller.enqueue(`${JSON.stringify(chunk)}\n\n`)

      enqueue({
        id: assistantMessage.id,
        metadata: assistantMessage.metadata ?? undefined,
        status: 'queued',
        role: 'assistant',
        parts: [],
      })

      try {
        const conversationConfiguration =
          await resolveConversationConfiguration({ conversationId })

        if (!conversationConfiguration) {
          throw new InvalidArgumentError({
            code: 'CONVERSATION_CONFIGURATION_NOT_FOUND',
            message: 'Conversation configuration not found',
          })
        }

        const [languageModel, activeTools, tools, prompts, messageHistory] =
          await Promise.all([
            conversationConfiguration.languageModel(),
            conversationConfiguration.activeTools(),
            conversationConfiguration.tools(),
            conversationConfiguration.prompts(),
            conversationConfiguration.messages({
              targetMessageId: userMessage.id,
            }),
          ])

        const validatedMessages = await safeValidateUIMessages({
          messages: [
            ...prompts,
            ...messageHistory,
            { ...userMessage, role: 'user' },
          ],
        })

        if (!validatedMessages.success) {
          throw new InvalidArgumentError({
            code: 'INVALID_MESSAGE_HISTORY',
            message: 'Invalid message history',
          })
        }

        const messages = await convertToModelMessages(validatedMessages.data)

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
          tools,
          activeTools,
          stopWhen: stepCountIs(5),
          abortSignal: stopSignal.signal,
          originalMessage: assistantMessage,
          messages,
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

            await queries.updateMessage({
              messageId: message.id,
              metadata: message.metadata,
              status: message.status,
              parts: message.parts,
            })
          },
          onFailed: async ({ message }) => {
            enqueue(message)

            await queries.updateMessage({
              messageId: message.id,
              metadata: message.metadata,
              status: message.status,
              parts: message.parts,
            })
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
          parts: [],
        }

        enqueue({
          id: assistantMessage.id,
          ...failedAssistantMessage,
        })

        await queries.updateMessage({
          messageId: assistantMessage.id,
          ...failedAssistantMessage,
        })
      } finally {
        controller.close()
      }
    },
  })

  await resumableStreamContext.createNewResumableStream(
    assistantMessage.id,
    () => stream,
  )
}
