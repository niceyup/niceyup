'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { CopyIcon } from 'lucide-react'

export function ViewOrganizationId({ id }: { id: string }) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-xl">Organization ID</h2>
          <p className="text-muted-foreground text-sm">
            This is your organization's ID within Niceyup.
          </p>
        </div>

        <InputGroup className="w-full max-w-md">
          <InputGroupInput defaultValue={id} readOnly />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(id)
              }}
            >
              <CopyIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="flex min-h-15 items-center justify-start gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Used when interacting with the Niceyup API.
        </p>
      </div>
    </div>
  )
}
