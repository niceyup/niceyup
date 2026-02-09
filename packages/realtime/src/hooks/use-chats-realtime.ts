'use client'

import type { ConversationVisibility } from '@workspace/core/conversations'
import * as React from 'react'
import { env } from '../lib/env'
import type {
  ConversationEvent,
  ConversationExplorerNodeEvent,
  ConversationsView,
  RealtimePayload,
} from '../lib/types'

type ContextParams = {
  organizationSlug: '$slug'
  teamId: '~' | '$id'
  agentId: '$id'
}

type UseChatsRealtimeParams<View extends ConversationsView> = {
  params: ContextParams
  visibility: ConversationVisibility
  view: View
  onData: ({
    channel,
    data,
  }: {
    channel: string
    data: View extends 'explorer'
      ? ConversationExplorerNodeEvent
      : ConversationEvent
  }) => Promise<void> | void
  onError?: ({ error }: { error: unknown }) => Promise<void> | void
  disable?: boolean
}

export function useChatsRealtime<View extends ConversationsView>({
  params,
  visibility,
  view,
  onData,
  onError,
  disable,
}: UseChatsRealtimeParams<View>) {
  const onDataRef = React.useRef(onData)
  const onErrorRef = React.useRef(onError)

  onDataRef.current = onData
  onErrorRef.current = onError

  React.useEffect(() => {
    if (
      disable ||
      !params.organizationSlug ||
      !params.teamId ||
      params.teamId === '~' ||
      !params.agentId ||
      visibility !== 'team'
    ) {
      return
    }

    let websocket: WebSocket | null = null

    try {
      const searchParams = new URLSearchParams({
        organizationSlug: params.organizationSlug,
        teamId: params.teamId,
        agentId: params.agentId,
        visibility,
        view,
      })

      const url = new URL(
        `${env.NEXT_PUBLIC_WEBSOCKET_URL}/api/ws/conversations?${searchParams}`,
      )

      websocket = new WebSocket(url)

      websocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimePayload<
            View extends 'explorer'
              ? ConversationExplorerNodeEvent
              : ConversationEvent
          >

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
  }, [params.organizationSlug, params.agentId, visibility, view, disable])
}
