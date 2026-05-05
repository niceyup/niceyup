import { getBillingPortalUrl } from '@/actions/billing'
import type { OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import Link from 'next/link'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export async function ManageBillingCard({ params }: { params: Params }) {
  const url = await getBillingPortalUrl(params)

  const Comp = url ? Link : Button

  return (
    <div className="flex w-full flex-row items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-sm">Manage Billing</h2>
        <p className="text-muted-foreground text-sm">
          View and manage your billing details.
        </p>
      </div>

      <Button disabled={!url} asChild>
        <Comp href={String(url)} target="_blank">
          Billing portal
          <SquareArrowOutUpRightIcon className="ml-auto" />
        </Comp>
      </Button>
    </div>
  )
}
