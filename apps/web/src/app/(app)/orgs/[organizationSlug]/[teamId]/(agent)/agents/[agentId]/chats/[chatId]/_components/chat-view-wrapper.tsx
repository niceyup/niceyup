import { authenticatedUser } from '@/lib/auth/server'
import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  Chat,
  ChatParams,
  MessageNode,
  OrganizationTeamParams,
} from '@/lib/types'
import { queries } from '@workspace/db/queries'
import { ChatView } from './chat-view'

type Params = OrganizationTeamParams & AgentParams & ChatParams

export async function ChatViewWrapper({
  params,
  chat,
}: {
  params: Params
  chat: Chat
}) {
  const {
    user: { id: userId },
  } = await authenticatedUser()

  const { data, error } = await sdk.listMessages({
    conversationId: chat.id,
    params: {
      organizationSlug: params.organizationSlug,
      agentId: params.agentId,
      parents: true,
    },
  })

  if (error) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-background">
        <p className="p-2 text-sm">{error.message}</p>
      </div>
    )
  }
  const [firstMessage] = data.messages

  const siblingRootMessages = await queries.listRootMessages({
    conversationId: chat.id,
    not: firstMessage?.id ? { messageId: firstMessage.id } : undefined,
  })

  return (
    <ChatView
      params={params}
      authorId={userId}
      initialMessages={
        [...siblingRootMessages, ...data.messages] as MessageNode[]
      }
    />
  )
}
