import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { Settings2Icon } from 'lucide-react'
import { ConversationConfiguration } from './conversation-configuration'

export async function SecondarySidebar() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex flex-row items-center justify-end gap-1 p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" className="size-8">
              <Settings2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configure</TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      <ConversationConfiguration />
    </div>
  )
}
