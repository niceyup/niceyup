'use client'

import { updateTag } from '@/actions/cache'
import type { AgentParams, Chat, OrganizationTeamParams } from '@/lib/types'
import { ChatList, ChatListProvider } from './chat-list'

type Params = OrganizationTeamParams & AgentParams

export function PrivateChatList({
  params,
  initialItems,
}: {
  params: Params
  initialItems?: Chat[]
}) {
  return (
    <ChatListProvider
      params={params}
      visibility="private"
      initialItems={initialItems}
      onRenameItem={async () => {
        await updateTag('update-chat')
      }}
      onDeleteItem={async () => {
        await updateTag('delete-chat')
      }}
    >
      <ChatList />
    </ChatListProvider>
  )
}
