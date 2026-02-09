import { PersistentAccordion } from '@/components/persistent-accordion'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Separator } from '@workspace/ui/components/separator'
import { MessageCircleIcon, UserPlusIcon, UsersIcon } from 'lucide-react'

type Params = OrganizationTeamParams & AgentParams

export async function ChatExplorerWrapper({ params }: { params: Params }) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-2">
      <PersistentAccordion
        type="multiple"
        name="chat-list"
        className="flex flex-col gap-2 *:border-none *:px-2"
      >
        <AccordionItem value="team-chats">
          <AccordionTrigger className="px-2 py-1.5 text-sm hover:no-underline [&>svg]:hidden hover:[&>svg]:block [&[data-state=closed]>svg]:block">
            <div className="flex items-center gap-1 text-muted-foreground">
              <UsersIcon className="size-4 shrink-0" />
              <span className="line-clamp-1 break-all text-start">
                Team chats
              </span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-1 pb-1">
            {params.teamId === '~' && (
              <p className="mx-auto max-w-[8rem] py-6 text-center text-muted-foreground text-xs">
                Select a team to view team chats
              </p>
            )}

            {params.teamId !== '~' && (
              <p className="py-6 text-center text-muted-foreground text-xs">
                Coming soon
              </p>
            )}
          </AccordionContent>
        </AccordionItem>

        <Separator />

        <AccordionItem value="your-chats">
          <AccordionTrigger className="px-2 py-1.5 text-sm hover:no-underline [&>svg]:hidden hover:[&>svg]:block [&[data-state=closed]>svg]:block">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageCircleIcon className="size-4 shrink-0" />
              <span className="line-clamp-1 break-all text-start">
                Your chats
              </span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-1 pb-1">
            <p className="py-6 text-center text-muted-foreground text-xs">
              Coming soon
            </p>
          </AccordionContent>
        </AccordionItem>

        <Separator />

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
            <p className="py-6 text-center text-muted-foreground text-xs">
              Coming soon
            </p>
          </AccordionContent>
        </AccordionItem>

        <Separator />
      </PersistentAccordion>
    </div>
  )
}
