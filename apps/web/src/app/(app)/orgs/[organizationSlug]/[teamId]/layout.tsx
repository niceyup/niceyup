import {
  getOrganization,
  getOrganizationTeam,
  setActiveOrganizationTeam,
} from '@/actions/organizations'
import { authenticatedUser } from '@/lib/auth/server'
import type { OrganizationTeamParams } from '@/lib/types'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  children: React.ReactNode
}>) {
  const { organizationSlug, teamId } = await params

  const {
    session: { activeOrganizationId, activeTeamId },
  } = await authenticatedUser()

  let organization = null
  let team = null

  if (teamId !== '~') {
    const organizationTeam = await getOrganizationTeam({
      organizationSlug,
      teamId,
    })

    organization = organizationTeam?.organization
    team = organizationTeam?.team
  } else {
    organization = await getOrganization({ organizationSlug })
  }

  if (organization) {
    if (team && team.id !== activeTeamId) {
      await setActiveOrganizationTeam({
        organizationId: organization.id,
        teamId: team.id,
      })
    } else if (organization.id !== activeOrganizationId) {
      await setActiveOrganizationTeam({
        organizationId: organization.id,
      })
    }
  }

  return children
}
