import { getActiveSubscription } from '@/actions/billing'
import { getOrganizationTeam } from '@/actions/organizations'
import { OrganizationNotFound } from '@/components/organization-not-found'
import type { OrganizationTeamParams } from '@/lib/types'
import { redirect } from 'next/navigation'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  children: React.ReactNode
}>) {
  const { organizationSlug, teamId } = await params

  if (teamId !== '~') {
    const organizationTeam = await getOrganizationTeam({
      organizationSlug,
      teamId,
    })

    if (!organizationTeam) {
      return <OrganizationNotFound />
    }
  }

  const activeSubscription = await getActiveSubscription({ organizationSlug })

  if (!activeSubscription) {
    return redirect(`/orgs/${organizationSlug}/~/settings/billing`)
  }

  return children
}
