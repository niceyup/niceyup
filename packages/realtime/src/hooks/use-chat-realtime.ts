'use client'

import type { ConversationVisibility } from '@workspace/core/conversations'
import * as React from 'react'
import { env } from '../lib/env'
import type { AIMessageNode } from '../lib/types'

type ContextParams = {
  organizationSlug: '$slug'
  agentId: '$id'
  chatId: 'new' | '$id'
}

type UseChatRealtimeParams = {
  params: ContextParams
  visibility?: ConversationVisibility | null
}

export function useChatRealtime({ params, visibility }: UseChatRealtimeParams) {
  const [error, setError] = React.useState<string>()
  const [messages, setMessages] = React.useState<AIMessageNode[]>([])

  React.useEffect(() => {
    if (
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

      websocket.onopen = () => {
        setError(undefined)
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AIMessageNode[]

          setMessages(data)
        } catch {
          setError('Connection error occurred')
        }
      }
    } catch (error) {
      websocket?.close()
      setError(
        (error as any)?.message ||
          'An error occurred while connecting to the server',
      )
    }

    return () => {
      websocket?.close()
    }
  }, [params.organizationSlug, params.agentId, params.chatId])

  return { messages, error }
}
