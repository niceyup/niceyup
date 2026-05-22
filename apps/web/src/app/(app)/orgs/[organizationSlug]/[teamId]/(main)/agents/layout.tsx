import { getOrganizationTeam } from '@/actions/organizations'
import { OrganizationNotFound } from '@/components/organization-not-found'
import type { OrganizationTeamParams } from '@/lib/types'

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

  return children
}
