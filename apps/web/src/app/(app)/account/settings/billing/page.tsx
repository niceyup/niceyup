import { getActiveSubscription } from '@/actions/billing'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { format } from 'date-fns'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import Link from 'next/link'
import { ManageBillingCard } from './_components/manage-billing-card'
import { PlanUpgradeButton } from './_components/plan-upgrade-button'

export default async function Page() {
  const activeSubscription = await getActiveSubscription()

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-row items-center justify-between gap-3">
          <h2 className="font-semibold text-xl">
            {activeSubscription ? 'Standard' : 'Hobby'} Plan
          </h2>

          <div className="flex flex-row items-center justify-end gap-1">
            {activeSubscription && (
              <span className="text-muted-foreground text-sm">
                {format(activeSubscription.currentPeriodStart, 'MMMM d, yyyy')}

                {activeSubscription.currentPeriodEnd &&
                  ` - ${format(activeSubscription.currentPeriodEnd, 'MMMM d, yyyy')}`}
              </span>
            )}
          </div>
        </div>

        {activeSubscription ? (
          <ManageBillingCard />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-4 p-4">
            <Badge variant="outline" className="rounded-sm">
              Standard
            </Badge>

            <div className="flex flex-col items-center justify-center gap-1">
              <h2 className="font-medium text-sm">Upgrade to Standard</h2>
              <p className="text-muted-foreground text-sm">
                Upgrade to the Standard plan to get access to all features and
                benefits.
              </p>
            </div>
          </div>
        )}
      </div>
      <div
        className={cn(
          'flex min-h-15 items-center justify-between gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6',
          activeSubscription && 'justify-end',
        )}
      >
        {activeSubscription ? (
          <>
            <p className="flex items-center gap-1 text-muted-foreground text-sm">
              Custom needs?
            </p>
            <Button variant="outline" asChild>
              <Link href="mailto:hello@niceyup.team">Contact Sales</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1 text-muted-foreground text-sm">
              Learn more about
              <Link
                href="/billing/plans"
                target="_blank"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Pricing and Plans
                <SquareArrowOutUpRightIcon className="size-3" />
              </Link>
            </p>
            <PlanUpgradeButton />
          </>
        )}
      </div>
    </div>
  )
}
