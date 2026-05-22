import { getActiveSubscription } from '@/actions/billing'
import { type Plan, availablePlans } from '@/lib/billing'
import type { OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { AvailablePlans } from './_components/available-plans'
import { ManageBillingCard } from './_components/manage-billing-card'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const activeSubscription = await getActiveSubscription({ organizationSlug })

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-lg border border-border bg-background">
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-row items-center justify-between gap-3">
            <h2 className="font-semibold text-xl">
              {activeSubscription
                ? `${availablePlans[activeSubscription.plan as Plan]?.name || 'Unknown'} Plan`
                : 'No Active Subscription'}
            </h2>

            <div className="flex flex-row items-center justify-end gap-1">
              {activeSubscription && (
                <span className="text-muted-foreground text-sm">
                  {activeSubscription.periodStart
                    ? format(activeSubscription.periodStart, 'MMMM d, yyyy')
                    : 'No start date'}
                  {' - '}
                  {activeSubscription.periodEnd
                    ? format(activeSubscription.periodEnd, 'MMMM d, yyyy')
                    : 'No end date'}
                </span>
              )}
            </div>
          </div>

          {activeSubscription ? (
            <ManageBillingCard params={{ organizationSlug }} />
          ) : (
            <div className="flex w-full flex-col items-center justify-center gap-4 p-4">
              <div className="flex flex-col items-center justify-center gap-1">
                <h2 className="font-medium text-sm">Subscribe to a Plan</h2>
                <p className="text-muted-foreground text-sm">
                  Choose a plan to unlock premium features and usage limits.
                </p>
              </div>

              <Button asChild>
                <Link href={`/orgs/${organizationSlug}/billing/plans`}>
                  View Plans
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="flex min-h-15 items-center justify-end gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
          <p className="flex items-center gap-1 text-muted-foreground text-sm">
            Custom needs?
          </p>
          <Button variant="outline" asChild>
            <Link href="mailto:hello@niceyup.team">Contact Sales</Link>
          </Button>
        </div>
      </div>

      {activeSubscription && (
        <AvailablePlans
          params={{ organizationSlug }}
          activePlan={activeSubscription.plan as Plan}
        />
      )}
    </div>
  )
}
