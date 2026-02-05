'use client'

import { updateTag } from '@/actions/cache'
import type { AgentParams, Chat, OrganizationTeamParams } from '@/lib/types'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { UserPlusIcon } from 'lucide-react'
import { ChatList, ChatListProvider } from './ui/chat-list'

type Params = OrganizationTeamParams & AgentParams

export function SharedChatList({
  params,
  initialItems,
}: {
  params: Params
  initialItems?: Chat[]
}) {
  return (
    <AccordionItem value="shared-chats">
      <AccordionTrigger className="px-2 py-1.5 text-sm hover:no-underline [&>svg]:hidden hover:[&>svg]:block [&[data-state=closed]>svg]:block">
        <div className="flex items-center gap-1 text-muted-foreground">
          <UserPlusIcon className="size-4 shrink-0" />
          <span className="line-clamp-1 break-all text-start">
            Shared chats with you
          </span>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pt-1 pb-1">
        {initialItems?.length ? (
          <ChatListProvider
            params={params}
            visibility="shared"
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
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
