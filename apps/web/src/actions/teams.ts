'use server'

import type { OrganizationTeamParams } from '@/lib/types'
import { queries } from '@workspace/db/queries'
import { cacheTag } from 'next/cache'
import { getMembership } from './membership'

type GetTeamParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  teamId: string
}

export async function getTeam({ organizationSlug, teamId }: GetTeamParams) {
  'use cache: private'
  cacheTag('update-team', 'delete-team')

  const membership = await getMembership({
    organizationSlug,
  })

  if (!membership) {
    return null
  }

  const team = await queries.ctx.getTeam(
    {
      userId: membership.isAdmin ? undefined : membership.userId,
      organizationId: membership.organizationId,
    },
    { teamId },
  )

  return team
}

type ListTeamsParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export async function listTeams({ organizationSlug }: ListTeamsParams) {
  'use cache: private'
  cacheTag('create-team')

  const membership = await getMembership({
    organizationSlug,
  })

  if (!membership) {
    return []
  }

  const teams = await queries.ctx.listTeams({
    userId: membership.isAdmin ? undefined : membership.userId,
    organizationId: membership.organizationId,
  })

  return teams
}

type ListTeamMembersParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  teamId: string
}

export async function listTeamMembers({
  organizationSlug,
  teamId,
}: ListTeamMembersParams) {
  'use cache: private'
  cacheTag('add-team-member', 'remove-team-member')

  const membership = await getMembership({
    organizationSlug,
  })

  if (!membership) {
    return []
  }

  const teamMembers = await queries.ctx.listTeamMembers(
    {
      userId: membership.isAdmin ? undefined : membership.userId,
      organizationId: membership.organizationId,
    },
    { teamId },
  )

  return teamMembers
}
