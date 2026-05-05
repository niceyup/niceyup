import { getMembership } from '@/actions/membership'
import { listTeamMembers } from '@/actions/teams'
import type { OrganizationTeamParams } from '@/lib/types'
import { TeamMemberList } from './_components/team-member-list'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { id: string }>
}>) {
  const { organizationSlug, id: teamId } = await params

  const membership = await getMembership({ organizationSlug })

  if (!membership) {
    return null
  }

  const teamMembers = await listTeamMembers({ organizationSlug, teamId })

  return (
    <TeamMemberList
      params={{ organizationSlug, teamId }}
      membership={membership}
      teamMembers={teamMembers}
    />
  )
}
