'use client'

import { type StreamableValue, readStreamableValue } from '@workspace/ai/rsc'
import type { AIMessage } from '@workspace/ai/types'
import * as React from 'react'

type ContextParams = {
  organizationSlug: '$slug'
  agentId: '$id'
  chatId: 'new' | '$id'
}

type ServerActionParams = (
  context: ContextParams,
  params: { conversationId: string; messageId: string },
) => Promise<
  | { data: StreamableValue<AIMessage, unknown>; error?: never }
  | { data?: never; error: { code: string; message: string } }
>

type UseChatMessageRealtimeParams = {
  params: ContextParams
  messageId: string
  serverAction: ServerActionParams
  onChunk?: (message: AIMessage) => void
  disable?: boolean
}

export function useChatMessageRealtime({
  params,
  messageId,
  serverAction,
  onChunk,
  disable,
}: UseChatMessageRealtimeParams) {
  const [isStreaming, startStreaming] = React.useTransition()

  const [error, setError] = React.useState<string>()
  const [data, setData] = React.useState<AIMessage>()

  const serverActionRef = React.useRef(serverAction)
  const onChunkRef = React.useRef(onChunk)

  serverActionRef.current = serverAction
  onChunkRef.current = onChunk

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

    startStreaming(async () => {
      try {
        const { data, error } = await serverActionRef.current(params, {
          conversationId: params.chatId,
          messageId,
        })

        if (error) {
          throw new Error(error.message)
        }

        for await (const message of readStreamableValue<AIMessage>(data)) {
          if (message) {
            onChunkRef.current?.(message)
            setData(message)
          }
        }
      } catch (error) {
        setError(
          (error as any)?.message ||
            'An error occurred while connecting to the server',
        )
      }
    })
  }, [
    params.organizationSlug,
    params.agentId,
    params.chatId,
    messageId,
    disable,
  ])

  return { isStreaming, data, error }
}
