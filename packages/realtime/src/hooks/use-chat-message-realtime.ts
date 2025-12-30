'use client'

import { type StreamableValue, readStreamableValue } from '@workspace/ai/rsc'
import type { AIMessage } from '@workspace/ai/types'
import * as React from 'react'

type ContextParams = {
  organizationSlug: '$slug'
  agentId: '$id'
  chatId: 'new' | '$id'
}

type StreamMessageActionParams = (
  context: ContextParams,
  params: { conversationId: string; messageId: string },
) => Promise<
  | { data: StreamableValue<AIMessage, unknown>; error?: never }
  | { data?: never; error: { code: string; message: string } }
>

type UseChatMessageRealtimeParams = {
  params: ContextParams
  messageId: string
  streamMessageAction: StreamMessageActionParams
  onMessageChunk?: (message: AIMessage) => void
  disable?: boolean
}

export function useChatMessageRealtime({
  params,
  messageId,
  streamMessageAction,
  onMessageChunk,
  disable,
}: UseChatMessageRealtimeParams) {
  const [error, setError] = React.useState<string>()
  const [message, setMessage] = React.useState<AIMessage>()

  async function startStreaming() {
    try {
      const { data, error } = await streamMessageAction(params, {
        conversationId: params.chatId,
        messageId,
      })

      if (error) {
        throw new Error(error.message)
      }

      for await (const message of readStreamableValue<AIMessage>(data)) {
        if (message) {
          onMessageChunk?.(message)
          setMessage(message)
        }
      }
    } catch (error) {
      setError(
        (error as any)?.message ||
          'An error occurred while connecting to the server',
      )
    }
  }

  React.useEffect(() => {
    if (
      disable ||
      !params.organizationSlug ||
      !params.agentId ||
      !params.chatId ||
      params.chatId === 'new' ||
      !messageId
    ) {
      return
    }

    startStreaming()
  }, [
    params.organizationSlug,
    params.agentId,
    params.chatId,
    messageId,
    disable,
  ])

  return { message, error }
}
