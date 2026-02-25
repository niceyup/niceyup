import { resumableStreamContext } from '@/lib/resumable-stream'
import {
  type ModelMessage,
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  validateUIMessages,
  wrapLanguageModel,
} from '@workspace/ai'
import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
} from '@workspace/ai/types'
import { queries } from '@workspace/db/queries'
import { createAgentAIStream } from '@workspace/engine'
import { InvalidArgumentError } from '@workspace/engine'
import { resolveConversationConfiguration } from '@workspace/engine/agents'
import throttle from 'throttleit'

async function validateAndConvertToModelMessages(messages: unknown) {
  const validatedMessages = await validateUIMessages({ messages })

  const modelMessages = await convertToModelMessages(validatedMessages)

  return modelMessages
}

async function processMessages({
  messages,
  lastMessage,
}: {
  messages: AIMessage[]
  lastMessage: {
    id: string
    role: AIMessageRole
    parts: AIMessagePart[]
    metadata?: AIMessageMetadata | null
  }
}): Promise<ModelMessage[]> {
  try {
    const [modelMessages, lastModelMessages] = await Promise.all([
      validateAndConvertToModelMessages(messages),
      validateAndConvertToModelMessages([lastMessage]),
    ])

    const prunedMessages = pruneMessages({
      messages: modelMessages,
      // reasoning: 'all',
      toolCalls: 'all',
      emptyMessages: 'remove',
    })

    return [...prunedMessages, ...lastModelMessages]
  } catch {
    throw new InvalidArgumentError({
      code: 'INVALID_MESSAGES',
      message: 'Invalid messages',
    })
  }
}

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
      const enqueue = (chunk: AIMessage) =>
        controller.enqueue(`${JSON.stringify(chunk)}\n\n`)

      enqueue({
        id: assistantMessage.id,
        metadata: assistantMessage.metadata ?? undefined,
        status: 'queued',
        role: 'assistant',
        parts: userMessage ? [] : assistantMessage.parts,
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
              targetMessageId: userMessage
                ? userMessage.id
                : assistantMessage.id,
            }),
          ])

        const processedMessages = await processMessages({
          messages: [...prompts, ...messageHistory],
          lastMessage: userMessage
            ? { ...userMessage, role: 'user' }
            : { ...assistantMessage, role: 'assistant' },
        })

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

        const enhancedModel = wrapLanguageModel({
          model: languageModel.model,
          middleware: [
            // extractReasoningMiddleware({ tagName: 'thinking' }),
            // defaultSettingsMiddleware({
            //   settings: {
            //     providerOptions: {
            //       openai: {
            //         reasoningEffort: 'high',
            //         reasoningSummary: 'detailed',
            //       } satisfies OpenAIResponsesProviderOptions,
            //       google: {
            //         thinkingConfig: {
            //           thinkingLevel: 'high',
            //           includeThoughts: true,
            //         },
            //       } satisfies GoogleGenerativeAIProviderOptions,
            //     },
            //   },
            // }),
          ],
        })

        await createAgentAIStream({
          model: enhancedModel,
          tools,
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
          parts: userMessage ? [] : assistantMessage.parts,
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

  await resumableStreamContext.createNewResumableStream(streamId, () => stream)
}
