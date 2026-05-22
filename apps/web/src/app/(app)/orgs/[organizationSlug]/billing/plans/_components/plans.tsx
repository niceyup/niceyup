'use client'

import { upgradeSubscription } from '@/actions/billing'
import { type Plan, availablePlans } from '@/lib/billing'
import type { OrganizationTeamParams } from '@/lib/types'
import { DEFAULT_CURRENCY_CODE } from '@workspace/billing/currency'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { CheckCircleIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

function actionPlanLabel(targetPlan: Plan, activePlan?: Plan) {
  if (!activePlan) {
    return 'Get Started'
  }

  const planTier = Object.keys(availablePlans)

  const step = planTier.indexOf(targetPlan) - planTier.indexOf(activePlan)

  if (step > 0) {
    return 'Upgrade'
  }

  if (step < 0) {
    return 'Downgrade'
  }

  return 'Current Plan'
}

export function PlanCard({
  params,
  plan,
  activePlan,
  isBilling,
}: {
  params: Params
  plan: Plan
  activePlan?: Plan
  isBilling?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const handleUpgrade = async () => {
    startTransition(async () => {
      const url = await upgradeSubscription(params, { plan })

      if (url) {
        router.push(url)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    })
  }

  const monthlyPrice = availablePlans[plan].price.monthly[DEFAULT_CURRENCY_CODE]

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: monthlyPrice.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monthlyPrice.value)

  return (
    <div className="flex w-full max-w-[18rem] flex-col gap-5 rounded-lg border border-border bg-background p-5">
      <h2 className="font-bold text-xl">{availablePlans[plan].name} Plan</h2>

      <p className="text-foreground text-sm leading-relaxed">
        {availablePlans[plan].description}
      </p>

      <h1 className="font-bold text-3xl">
        {formattedPrice}{' '}
        <span className="text-muted-foreground text-sm">/month</span>
      </h1>

      {!isBilling ? (
        <Button disabled>{actionPlanLabel(plan, activePlan)}</Button>
      ) : activePlan === plan ? (
        <Button asChild>
          <Link href={`/orgs/${params.organizationSlug}/~/settings/billing`}>
            Manage Billing
          </Link>
        </Button>
      ) : (
        <Button onClick={handleUpgrade} disabled={isPending}>
          {isPending && <Spinner />}
          {actionPlanLabel(plan, activePlan)}
        </Button>
      )}

      <ul className="flex flex-col gap-2">
        {availablePlans[plan].features.map((feature) => (
          <li className="flex items-start gap-2" key={feature}>
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />

            <span className="text-foreground text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
