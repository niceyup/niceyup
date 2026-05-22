import { getActiveSubscription } from '@/actions/billing'
import { getMembershipRole } from '@/actions/membership'
import { Header } from '@/components/header'
import { type Plan, availablePlans } from '@/lib/billing'
import type { OrganizationTeamParams } from '@/lib/types'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { PlanCard } from './_components/plans'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const membershipRole = await getMembershipRole({ organizationSlug })

  const activeSubscription = await getActiveSubscription({ organizationSlug })

  return (
    <>
      <Header organizationSlug={organizationSlug} withoutTeam />

      <main className="relative flex flex-1 flex-col bg-background">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-4">
            <Skeleton className="aspect-video" />
            <Skeleton className="aspect-video" />
            <Skeleton className="aspect-video" />
          </div>
          <Skeleton className="mx-auto max-h-300 w-full max-w-5xl flex-1" />
        </div>

        <div className="absolute flex h-full max-h-300 w-full items-center justify-center gap-4">
          {Object.keys(availablePlans).map((plan) => (
            <PlanCard
              key={plan}
              params={{ organizationSlug }}
              plan={plan as Plan}
              activePlan={activeSubscription?.plan as Plan}
              isBilling={membershipRole.isBilling}
            />
          ))}
        </div>
      </main>
    </>
  )
}
