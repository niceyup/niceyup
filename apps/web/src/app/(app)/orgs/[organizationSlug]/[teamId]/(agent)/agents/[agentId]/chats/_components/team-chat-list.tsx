'use client'

import { updateTag } from '@/actions/cache'
import type { AgentParams, Chat, OrganizationTeamParams } from '@/lib/types'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { UsersIcon } from 'lucide-react'
import { ChatList, ChatListProvider } from './ui/chat-list'

type Params = OrganizationTeamParams & AgentParams

export function TeamChatList({
  params,
  initialItems,
}: {
  params: Params
  initialItems?: Chat[]
}) {
  return (
    <AccordionItem value="team-chats">
      <AccordionTrigger className="px-2 py-1.5 text-sm hover:no-underline [&>svg]:hidden hover:[&>svg]:block [&[data-state=closed]>svg]:block">
        <div className="flex items-center gap-1 text-muted-foreground">
          <UsersIcon className="size-4 shrink-0" />
          <span className="line-clamp-1 break-all text-start">Team chats</span>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pt-1 pb-1">
        {params.teamId === '~' && (
          <p className="py-6 text-center text-muted-foreground text-xs">
            Select a team to view its chats
          </p>
        )}

        {params.teamId !== '~' &&
          (initialItems?.length ? (
            <ChatListProvider
              params={params}
              visibility="team"
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
          ) : (
            <p className="py-6 text-center text-muted-foreground text-xs">
              Empty
            </p>
          ))}
      </AccordionContent>
    </AccordionItem>
  )
}
