'use client'

import { updateTag } from '@/actions/cache'
import type {
  AgentParams,
  ChatParams,
  OrganizationTeamParams,
} from '@/lib/types'
import { useChatRealtime } from '@workspace/realtime/hooks'
import type * as React from 'react'

type Params = OrganizationTeamParams & AgentParams & ChatParams

export function ChatRealtime({
  params,
  children,
}: {
  params: Params
  children: React.ReactNode
}) {
  useChatRealtime({
    params: {
      organizationSlug: params.organizationSlug,
      agentId: params.agentId,
    },
    chatId: params.chatId,
    onData: async ({ data }) => {
      if (data.action === 'update') {
        await updateTag('update-chat')
      }
    },
    disable: params.chatId === 'new',
  })

  return children
}
