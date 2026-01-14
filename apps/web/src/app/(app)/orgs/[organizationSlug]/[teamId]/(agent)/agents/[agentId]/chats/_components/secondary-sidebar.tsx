import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { Settings2Icon } from 'lucide-react'

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

      <div className="flex-1 overflow-y-auto p-2">
        <p className="py-6 text-center text-muted-foreground text-xs">
          Coming soon
        </p>
      </div>
    </div>
  )
}
