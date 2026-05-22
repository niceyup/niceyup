'use client'

import { type Plan, availablePlans } from '@/lib/billing'
import type { OrganizationTeamParams } from '@/lib/types'
import { Badge } from '@workspace/ui/components/badge'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import Link from 'next/link'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function AvailablePlans({
  params,
  activePlan,
}: {
  params: Params
  activePlan?: Plan
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-xl">Available Plans</h2>
        </div>

        <div className="flex w-full flex-col gap-2">
          {Object.values(availablePlans).map(({ plan, name, description }) => (
            <div
              key={plan}
              className="flex w-full flex-row items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-sm">{name} Plan</h2>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>

              {activePlan === plan && <Badge variant="outline">Active</Badge>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-15 items-center justify-start gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
        <p className="flex items-center gap-1 text-muted-foreground text-sm">
          Learn more about
          <Link
            href={`/orgs/${params.organizationSlug}/billing/plans`}
            target="_blank"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Pricing and Plans
            <SquareArrowOutUpRightIcon className="size-3" />
          </Link>
        </p>
      </div>
    </div>
  )
}
