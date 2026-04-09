'use client'

import * as React from 'react'
import { env } from '../lib/env'
import type { ConversationEvent, RealtimePayload } from '../lib/types'

type ContextParams = {
  organizationSlug: '$slug'
  agentId: '$id'
}

type UseChatRealtimeParams = {
  params: ContextParams
  chatId: string
  onData: ({
    channel,
    data,
  }: {
    channel: string
    data: ConversationEvent
  }) => Promise<void> | void
  onError?: ({ error }: { error: unknown }) => Promise<void> | void
  disable?: boolean
}

export function useChatRealtime({
  params,
  chatId,
  onData,
  onError,
  disable,
}: UseChatRealtimeParams) {
  const onDataRef = React.useRef(onData)
  const onErrorRef = React.useRef(onError)

  onDataRef.current = onData
  onErrorRef.current = onError

  React.useEffect(() => {
    if (disable || !params.organizationSlug || !params.agentId || !chatId) {
      return
    }

    let websocket: WebSocket | null = null

    try {
      const searchParams = new URLSearchParams({
        organizationSlug: params.organizationSlug,
        agentId: params.agentId,
      })

      const url = new URL(
        `${env.NEXT_PUBLIC_WEBSOCKET_URL}/api/ws/conversations/${chatId}?${searchParams}`,
      )

      websocket = new WebSocket(url)

      websocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(
            event.data,
          ) as RealtimePayload<ConversationEvent>

          if (typeof payload.channel !== 'string' || !payload.channel) {
            return
          }

          onDataRef.current({ channel: payload.channel, data: payload.data })
        } catch (error) {
          onErrorRef.current?.({ error })
        }
      }
    } catch (error) {
      websocket?.close()
      onErrorRef.current?.({ error })
    }

    return () => {
      websocket?.close()
    }
  }, [params.organizationSlug, params.agentId, chatId, disable])
}
