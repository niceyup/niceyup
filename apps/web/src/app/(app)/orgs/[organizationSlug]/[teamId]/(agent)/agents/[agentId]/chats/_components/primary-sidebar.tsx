import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { Label } from '@workspace/ui/components/label'
import { Separator } from '@workspace/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import {
  FolderTreeIcon,
  MessagesSquareIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import { cacheTag } from 'next/cache'
import Link from 'next/link'
import { PrivateChatList } from './private-chat-list'

type Params = OrganizationTeamParams & AgentParams

export function PrimarySidebar({ params }: { params: Params }) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex flex-row items-center justify-start gap-1 p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" className="size-8">
              <MessagesSquareIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Chats</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <FolderTreeIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Explorer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <SearchIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      <ChatList params={params} />
    </div>
  )
}

async function listConversations(params: {
  organizationSlug: string
  teamId: string
  agentId: string
}) {
  'use cache: private'
  cacheTag('create-chat', 'delete-chat')

  const { data } = await sdk.listConversations({
    params: {
      organizationSlug: params.organizationSlug,
      teamId: params.teamId,
      agentId: params.agentId,
    },
  })

  return data?.conversations || []
}

async function ChatList({ params }: { params: Params }) {
  const conversations = await listConversations(params)

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
      <Button variant="ghost" className="w-full justify-start" asChild>
        <Link
          href={`/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/new`}
        >
          <PlusIcon className="size-4" /> New chat
        </Link>
      </Button>

      <Label className="mt-2 px-2 py-1.5 text-muted-foreground text-sm">
        Your chats
      </Label>

      {conversations.length ? (
        <PrivateChatList params={params} initialItems={conversations} />
      ) : (
        <p className="py-6 text-center text-muted-foreground text-xs">Empty</p>
      )}
    </div>
  )
}
