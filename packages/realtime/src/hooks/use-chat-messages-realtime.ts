'use client'

import type { ConversationVisibility } from '@workspace/core/conversations'
import * as React from 'react'
import { env } from '../lib/env'
import type { AIMessageNode, RealtimePayload } from '../lib/types'

type ContextParams = {
  organizationSlug: '$slug'
  agentId: '$id'
  chatId: 'new' | '$id'
}

type UseChatMessagesRealtimeParams = {
  params: ContextParams
  visibility?: ConversationVisibility | null
  onData: ({
    channel,
    data,
  }: {
    channel: string
    data: AIMessageNode[]
  }) => Promise<void> | void
  onError: ({ errorMessage }: { errorMessage: string }) => Promise<void> | void
  disable?: boolean
}

export function useChatMessagesRealtime({
  params,
  visibility,
  onData,
  onError,
  disable,
}: UseChatMessagesRealtimeParams) {
  const onDataRef = React.useRef(onData)
  const onErrorRef = React.useRef(onError)

  onDataRef.current = onData
  onErrorRef.current = onError

  React.useEffect(() => {
    if (
      disable ||
      !params.organizationSlug ||
      !params.agentId ||
      !params.chatId ||
      params.chatId === 'new' ||
      !visibility ||
      visibility === 'private'
    ) {
      return
    }

    let websocket: WebSocket | null = null

    try {
      const searchParams = new URLSearchParams({
        organizationSlug: params.organizationSlug,
        agentId: params.agentId,
      })

      const url = new URL(
        `${env.NEXT_PUBLIC_WEBSOCKET_URL}/api/ws/conversations/${params.chatId}/messages?${searchParams}`,
      )

      websocket = new WebSocket(url)

      websocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimePayload<
            AIMessageNode[]
          >

          if (typeof payload.channel !== 'string' || !payload.channel) {
            return
          }

          onDataRef.current({ channel: payload.channel, data: payload.data })
        } catch {
          onErrorRef.current({ errorMessage: 'Connection error occurred' })
        }
      }
    } catch (error) {
      websocket?.close()
      onErrorRef.current({
        errorMessage:
          (error as any)?.message ||
          'An error occurred while connecting to the server',
      })
    }

    return () => {
      websocket?.close()
    }
  }, [
    params.organizationSlug,
    params.agentId,
    params.chatId,
    visibility,
    disable,
  ])
}
