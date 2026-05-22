import { getOrganization, getOrganizationTeam } from '@/actions/organizations'
import { Header } from '@/components/header'
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

  let organization = null

  if (teamId !== '~') {
    const organizationTeam = await getOrganizationTeam({
      organizationSlug,
      teamId,
    })

    organization = organizationTeam?.organization
  } else {
    organization = await getOrganization({ organizationSlug })
  }

  if (!organization) {
    return (
      <>
        <Header selectedOrganizationLabel="Not found" />

        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <OrganizationNotFound />
        </main>
      </>
    )
  }

  return children
}
