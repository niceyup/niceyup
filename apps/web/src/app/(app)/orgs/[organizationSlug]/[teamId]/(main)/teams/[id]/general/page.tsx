import { getMembershipRole } from '@/actions/membership'
import { getTeam } from '@/actions/teams'
import type { OrganizationTeamParams } from '@/lib/types'
import { DeleteTeamForm } from './_components/delete-team-form'
import { EditTeamNameForm } from './_components/edit-team-name-form'
import { ViewTeamId } from './_components/view-team-id'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { id: string }>
}>) {
  const { organizationSlug, id: teamId } = await params

  const membershipRole = await getMembershipRole({ organizationSlug })

  const team = await getTeam({ organizationSlug, teamId })

  if (!team) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditTeamNameForm
        params={{
          organizationSlug,
          organizationId: team.organizationId,
          teamId,
        }}
        name={team.name}
        isAdmin={membershipRole.isAdmin}
      />

      <ViewTeamId id={teamId} />

      {membershipRole.isAdmin && (
        <DeleteTeamForm
          params={{
            organizationSlug,
            organizationId: team.organizationId,
            teamId: team.id,
          }}
        />
      )}
    </div>
  )
}
