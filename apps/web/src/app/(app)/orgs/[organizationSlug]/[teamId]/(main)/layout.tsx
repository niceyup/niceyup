import { isOrganizationMemberAdmin } from '@/actions/membership'
import { getOrganization, getOrganizationTeam } from '@/actions/organizations'
import { Header } from '@/components/header'
import { OrganizationNotFound } from '@/components/organization-not-found'
import { TabBar, type TabItem } from '@/components/tab-bar'
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

  const {
    session: { activeOrganizationId, activeTeamId },
  } = await authenticatedUser()

  const currentTeamId =
    activeOrganizationId === organization?.id && teamId === '~'
      ? activeTeamId
      : teamId

  const tabs: TabItem[] = [
    {
      label: 'Overview',
      href: `/orgs/${organizationSlug}/${currentTeamId || '~'}/overview`,
    },
    {
      label: 'Agents',
      href: `/orgs/${organizationSlug}/${currentTeamId || '~'}/agents`,
      deep: true,
    },
  ]

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  if (isAdmin) {
    tabs.push(
      ...[
        {
          label: 'Providers',
          href: `/orgs/${organizationSlug}/~/providers`,
        },
        {
          label: 'Sources',
          href: `/orgs/${organizationSlug}/~/sources`,
          deep: true,
        },
        {
          label: 'Connections',
          href: `/orgs/${organizationSlug}/~/connections`,
        },
      ],
    )
  }

  tabs.push(
    ...[
      {
        label: 'Teams',
        href: `/orgs/${organizationSlug}/~/teams`,
        deep: true,
      },
      {
        label: 'Settings',
        href: `/orgs/${organizationSlug}/~/settings`,
        deep: true,
      },
    ],
  )

  return (
    <>
      <Header organizationSlug={organizationSlug} teamId={teamId} />

      <TabBar tabs={tabs} />

      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        {children}
      </main>
    </>
  )
}
