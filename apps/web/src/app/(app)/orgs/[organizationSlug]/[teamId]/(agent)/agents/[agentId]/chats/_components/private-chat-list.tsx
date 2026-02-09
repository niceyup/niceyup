'use client'

import { updateTag } from '@/actions/cache'
import type { AgentParams, Chat, OrganizationTeamParams } from '@/lib/types'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { MessageCircleIcon } from 'lucide-react'
import { ChatList, ChatListProvider } from './ui/chat-list'

type Params = OrganizationTeamParams & AgentParams

export function PrivateChatList({
  params,
  initialItems,
}: {
  params: Params
  initialItems?: Chat[]
}) {
  return (
    <AccordionItem value="your-chats">
      <AccordionTrigger className="px-2 py-1.5 text-sm hover:no-underline [&>svg]:hidden hover:[&>svg]:block [&[data-state=closed]>svg]:block">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MessageCircleIcon className="size-4 shrink-0" />
          <span className="line-clamp-1 break-all text-start">Your chats</span>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pt-1 pb-1">
        {initialItems?.length ? (
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
        ) : (
          <p className="py-6 text-center text-muted-foreground text-xs">
            No private chats yet
          </p>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
