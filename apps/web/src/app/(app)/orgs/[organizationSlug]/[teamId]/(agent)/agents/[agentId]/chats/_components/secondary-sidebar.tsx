import { Separator } from '@workspace/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { Settings2Icon } from 'lucide-react'
import { ConversationConfiguration } from './conversation-configuration'
import { TabsContent, TabsProvider, TabsTrigger } from './ui/tabs'

export async function SecondarySidebar() {
  return (
    <TabsProvider initialTab="general">
      <div className="flex h-full flex-col bg-background">
        <div className="flex flex-row items-center justify-end gap-1 p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="general" size="icon" className="size-8">
                <Settings2Icon />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>General</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        <TabsContent value="general">
          <ConversationConfiguration />
        </TabsContent>
      </div>
    </TabsProvider>
  )
}
