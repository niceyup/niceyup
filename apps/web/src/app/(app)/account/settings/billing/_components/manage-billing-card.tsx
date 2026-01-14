import { getBillingPortalUrl } from '@/actions/billing'
import { Button } from '@workspace/ui/components/button'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import Link from 'next/link'

export async function ManageBillingCard() {
  const url = await getBillingPortalUrl()

  return (
    <div className="flex w-full flex-row items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-sm">Manage Billing</h2>
        <p className="text-muted-foreground text-sm">
          View and manage your billing details.
        </p>
      </div>

      <Button asChild>
        <Link href={url} target="_blank">
          Billing portal
          <SquareArrowOutUpRightIcon className="ml-auto" />
        </Link>
      </Button>
    </div>
  )
}
