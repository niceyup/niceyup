import {
  type ModelMessage,
  convertToModelMessages,
  pruneMessages,
  validateUIMessages,
} from '@workspace/ai'
import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
} from '@workspace/ai/types'
import { InvalidArgumentError } from '@workspace/core/errros'

async function validateAndConvertToModelMessages(messages: unknown) {
  const validatedMessages = await validateUIMessages({ messages })

  const modelMessages = await convertToModelMessages(validatedMessages)

  return modelMessages
}

export type PartialMessage = {
  id: string
  role: AIMessageRole
  parts: AIMessagePart[]
  metadata?: AIMessageMetadata | null
}

export async function processMessages({
  messages,
  lastMessage,
}: {
  messages: AIMessage[]
  lastMessage: PartialMessage
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
