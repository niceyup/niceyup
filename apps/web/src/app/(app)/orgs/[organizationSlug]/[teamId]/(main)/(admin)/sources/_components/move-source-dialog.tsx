import type { OrganizationTeamParams } from '@/lib/types'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { cn } from '@workspace/ui/lib/utils'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function MoveSourceDialog({
  itemId,
  name,
  folder,
}: {
  params: Params
  itemId: string
  name: string | null
  folder?: boolean
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Move "
          <span className={cn({ italic: !name })}>
            {name || (folder ? 'Unnamed folder' : 'Untitled')}
          </span>
          "
        </DialogTitle>
      </DialogHeader>

      <div>
        <p className="py-24 text-center text-muted-foreground text-xs">
          Coming soon ({itemId})
        </p>
      </div>
    </DialogContent>
  )
}
