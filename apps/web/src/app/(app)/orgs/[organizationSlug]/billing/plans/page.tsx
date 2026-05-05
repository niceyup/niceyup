import { getActiveSubscription } from '@/actions/billing'
import { Header } from '@/components/header'
import type { OrganizationTeamParams } from '@/lib/types'
import { plans } from '@workspace/billing/plans'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { StandardPlan } from './_components/standard-plan'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const activeSubscription = await getActiveSubscription({ organizationSlug })

  return (
    <>
      <Header selectedOrganizationLabel="Onboarding" />

      <main className="relative flex flex-1 flex-col bg-background">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-4">
            <Skeleton className="aspect-video" />
            <Skeleton className="aspect-video" />
            <Skeleton className="aspect-video" />
          </div>
          <Skeleton className="mx-auto max-h-300 w-full max-w-5xl flex-1" />
        </div>

        <div className="absolute flex h-full max-h-300 w-full items-center justify-center">
          <StandardPlan
            params={{ organizationSlug }}
            isActive={activeSubscription?.plan === plans.standard.slug}
          />
        </div>
      </main>
    </>
  )
}
