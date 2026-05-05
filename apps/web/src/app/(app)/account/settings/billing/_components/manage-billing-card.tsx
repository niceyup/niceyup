import { Button } from '@workspace/ui/components/button'
import { SquareArrowOutUpRightIcon } from 'lucide-react'

export async function ManageBillingCard() {
  return (
    <div className="flex w-full flex-row items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-sm">Manage Billing</h2>
        <p className="text-muted-foreground text-sm">
          View and manage your billing details.
        </p>
      </div>

      <Button disabled>
        Billing portal
        <SquareArrowOutUpRightIcon className="ml-auto" />
      </Button>
    </div>
  )
}
