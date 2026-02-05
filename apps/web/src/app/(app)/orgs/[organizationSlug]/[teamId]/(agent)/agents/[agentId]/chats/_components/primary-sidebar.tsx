import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Separator } from '@workspace/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { FolderTreeIcon, MessagesSquareIcon, SearchIcon } from 'lucide-react'
import { ChatExplorerWrapper } from './chat-explorer-wrapper'
import { ChatListWrapper } from './chat-list-wrapper'
import { TabsContent, TabsProvider, TabsTrigger } from './ui/tabs'

type Params = OrganizationTeamParams & AgentParams

export function PrimarySidebar({ params }: { params: Params }) {
  return (
    <TabsProvider initialTab="chats">
      <div className="flex h-full flex-col bg-background">
        <div className="flex flex-row items-center justify-start gap-1 p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="chats" size="icon" className="size-8">
                <MessagesSquareIcon />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>Chats</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="explorer" size="icon" className="size-8">
                <FolderTreeIcon />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>Explorer</TooltipContent>
          </Tooltip>

          <Dialog>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Search</DialogTitle>
              </DialogHeader>

              <div>
                <p className="py-24 text-center text-muted-foreground text-xs">
                  Coming soon
                </p>
              </div>
            </DialogContent>

            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <SearchIcon />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
          </Dialog>
        </div>

        <Separator />

        <TabsContent value="chats">
          <ChatListWrapper params={params} />
        </TabsContent>

        <TabsContent value="explorer">
          <ChatExplorerWrapper params={params} />
        </TabsContent>
      </div>
    </TabsProvider>
  )
}
