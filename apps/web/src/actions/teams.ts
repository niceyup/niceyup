'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
import type { OrganizationTeamParams } from '@/lib/types'
import { queries } from '@workspace/db/queries'
import { cacheTag } from 'next/cache'
import { isOrganizationMemberAdmin } from './membership'

type GetTeamParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  teamId: string
}

export async function getTeam({ organizationSlug, teamId }: GetTeamParams) {
  'use cache: private'
  cacheTag('update-team', 'delete-team')

  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await resolveOrganizationContext({ userId, organizationSlug })

  if (!ctx) {
    return null
  }

  const isAdmin = await isOrganizationMemberAdmin(ctx)

  const team = await queries.context.getTeam({ ...ctx, isAdmin }, { teamId })

  return team
}

type ListTeamsParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export async function listTeams({ organizationSlug }: ListTeamsParams) {
  'use cache: private'
  cacheTag('create-team')

  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await resolveOrganizationContext({ userId, organizationSlug })

  if (!ctx) {
    return []
  }

  const isAdmin = await isOrganizationMemberAdmin(ctx)

  const teams = await queries.context.listTeams({ ...ctx, isAdmin })

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

  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await resolveOrganizationContext({ userId, organizationSlug })

  if (!ctx) {
    return []
  }

  const isAdmin = await isOrganizationMemberAdmin(ctx)

  const teamMembers = await queries.context.listTeamMembers(
    { ...ctx, isAdmin },
    { teamId },
  )

  return teamMembers
}
