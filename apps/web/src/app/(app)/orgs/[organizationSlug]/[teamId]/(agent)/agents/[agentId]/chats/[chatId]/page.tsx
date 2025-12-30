import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  ChatParams,
  OrganizationTeamParams,
} from '@/lib/types'
import { Separator } from '@workspace/ui/components/separator'
import { cacheTag } from 'next/cache'
import { ChatNotFound } from './_components/chat-not-found'
import { ChatViewWrapper } from './_components/chat-view-wrapper'
import { NewChatWrapper } from './_components/new-chat-wrapper'
import { Tabbar } from './_components/tabbar'

async function getConversation(params: {
  organizationSlug: string
  agentId: string
  chatId: string
}) {
  'use cache: private'
  cacheTag('update-chat')

  if (params.chatId !== 'new') {
    const { data } = await sdk.getConversation({
      conversationId: params.chatId,
      params: {
        organizationSlug: params.organizationSlug,
        agentId: params.agentId,
      },
    })

    return data?.conversation || null
  }

  return null
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams & ChatParams>
}>) {
  const { organizationSlug, teamId, agentId, chatId } = await params

  const chat = await getConversation({ organizationSlug, agentId, chatId })

  return (
    <div className="flex h-full flex-col bg-background">
      <Tabbar params={{ chatId }} chat={chat} />

      <Separator />

      {chat ? (
        <ChatViewWrapper
          params={{ organizationSlug, teamId, agentId, chatId }}
          chat={chat}
        />
      ) : chatId === 'new' ? (
        <NewChatWrapper
          params={{ organizationSlug, teamId, agentId, chatId }}
        />
      ) : (
        <ChatNotFound />
      )}
    </div>
  )
}
