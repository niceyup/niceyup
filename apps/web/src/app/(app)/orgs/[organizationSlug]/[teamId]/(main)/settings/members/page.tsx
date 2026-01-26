import { listPendingInvitations } from '@/actions/invitations'
import { getMembership } from '@/actions/membership'
import { listOrganizationMembers } from '@/actions/organizations'
import { listTeams } from '@/actions/teams'
import { PermissionDenied } from '@/components/permission-denied'
import type { OrganizationTeamParams } from '@/lib/types'
import type { SearchParams } from 'nuqs/server'
import { MemberList } from './_components/member-list'
import { PendingInvitationsList } from './_components/pending-invitations-list'
import { TabBar, type TabItem } from './_components/tab-bar'
import { loadSearchParams } from './_lib/search-params'

export default async function Page({
  params,
  searchParams,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  searchParams: Promise<SearchParams>
}>) {
  const { organizationSlug } = await params
  const { tab } = await loadSearchParams(searchParams)

  const membership = await getMembership({ organizationSlug })

  if (!membership) {
    return null
  }

  const isOwner = membership?.role === 'owner'
  const isAdmin = membership?.isAdmin
  const isPremium = true

  const [members, pendingInvitations, teams] = await Promise.all([
    listOrganizationMembers({ organizationSlug }),
    isAdmin ? listPendingInvitations({ organizationSlug }) : undefined,
    listTeams({ organizationSlug }),
  ])

  const tabs: TabItem[] = [
    {
      value: 'member' as const,
      label: 'Members',
    },
  ]

  if (isAdmin) {
    tabs.push({
      value: 'pending' as const,
      label: 'Pending Invitations',
      count: pendingInvitations?.length,
    })
  }

  return (
    <>
      <TabBar tabValue={tab} tabs={tabs} />

      {tab === 'member' && (
        <MemberList
          params={{
            organizationSlug,
            organizationId: membership.organizationId,
          }}
          userId={membership.userId}
          isOwner={isOwner}
          isAdmin={isAdmin}
          isPremium={isPremium}
          members={members}
          teams={teams}
        />
      )}

      {tab === 'pending' &&
        (isAdmin ? (
          <PendingInvitationsList
            params={{
              organizationSlug,
              organizationId: membership.organizationId,
            }}
            isPremium={isPremium}
            pendingInvitations={pendingInvitations}
            teams={teams}
          />
        ) : (
          <div className="flex w-full flex-col">
            <div className="rounded-lg border bg-background p-4 py-24">
              <PermissionDenied />
            </div>
          </div>
        ))}
    </>
  )
}
