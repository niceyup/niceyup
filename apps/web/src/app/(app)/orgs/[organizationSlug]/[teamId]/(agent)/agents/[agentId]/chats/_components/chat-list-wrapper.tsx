import { PersistentAccordion } from '@/components/persistent-accordion'
import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  ConversationVisibility,
  OrganizationTeamParams,
} from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { PlusIcon } from 'lucide-react'
import { cacheTag } from 'next/cache'
import Link from 'next/link'
import { PrivateChatList } from './private-chat-list'
import { SharedChatList } from './shared-chat-list'
import { TeamChatList } from './team-chat-list'

type Params = OrganizationTeamParams & AgentParams

export async function ChatListWrapper({ params }: { params: Params }) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-2">
      <div className="px-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link
            href={`/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/new`}
          >
            <PlusIcon /> New chat
          </Link>
        </Button>
      </div>

      <PersistentAccordion
        type="multiple"
        name="chat-list"
        className="flex flex-col gap-3 *:border-none *:px-2"
      >
        <TeamChatListWrapper params={params} />

        <PrivateChatListWrapper params={params} />

        <SharedChatListWrapper params={params} />
      </PersistentAccordion>
    </div>
  )
}

async function listConversations(
  visibility: ConversationVisibility,
  params: {
    organizationSlug: string
    teamId: string
    agentId: string
  },
) {
  'use cache: private'
  cacheTag('create-chat', 'delete-chat')

  const { data } = await sdk.listConversations({
    params: {
      organizationSlug: params.organizationSlug,
      teamId: params.teamId,
      agentId: params.agentId,
      visibility,
    },
  })

  return data?.conversations || []
}

const TeamChatListWrapper = async ({ params }: { params: Params }) => {
  const conversations =
    params.teamId !== '~' ? await listConversations('team', params) : []

  return <TeamChatList params={params} initialItems={conversations} />
}

const PrivateChatListWrapper = async ({ params }: { params: Params }) => {
  const conversations = await listConversations('private', params)

  return <PrivateChatList params={params} initialItems={conversations} />
}

const SharedChatListWrapper = async ({ params }: { params: Params }) => {
  const conversations = await listConversations('shared', params)

  return <SharedChatList params={params} initialItems={conversations} />
}
