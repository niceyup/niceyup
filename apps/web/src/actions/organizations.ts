'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { auth } from '@workspace/auth'
import { queries } from '@workspace/db/queries'
import { cacheTag } from 'next/cache'
import { headers } from 'next/headers'

type GetOrganizationSlugByIdParams = {
  organizationId: string | null | undefined
}

export async function getOrganizationSlugById({
  organizationId,
}: GetOrganizationSlugByIdParams) {
  return await queries.getOrganizationSlugById({ organizationId })
}

type GetOrganizationIdBySlugParams = {
  organizationSlug: string | null | undefined
}

export async function getOrganizationIdBySlug({
  organizationSlug,
}: GetOrganizationIdBySlugParams) {
  return await queries.getOrganizationIdBySlug({ organizationSlug })
}

type GetOrganizationParams = {
  organizationSlug: string
}

export async function getOrganization({
  organizationSlug,
}: GetOrganizationParams) {
  const { user } = await authenticatedUser()

  const organization = await queries.ctx.getOrganization({
    userId: user.id,
    organizationSlug,
  })

  return organization
}

type GetOrganizationTeamParams = {
  organizationSlug: string
  teamId: string
}

export async function getOrganizationTeam({
  organizationSlug,
  teamId,
}: GetOrganizationTeamParams) {
  const { user } = await authenticatedUser()

  const organizationTeam = await queries.ctx.getOrganizationTeam({
    userId: user.id,
    organizationSlug,
    teamId,
  })

  return organizationTeam
}

export async function listOrganizations() {
  'use cache: private'
  cacheTag('update-organization')

  const { user } = await authenticatedUser()

  const organizations = await queries.ctx.listOrganizations({
    userId: user.id,
  })

  return organizations
}

type ListOrganizationTeamsParams = {
  organizationSlug: string
}

export async function listOrganizationTeams({
  organizationSlug,
}: ListOrganizationTeamsParams) {
  'use cache: private'
  cacheTag('create-team', 'update-team', 'delete-team')

  const { user } = await authenticatedUser()

  const organizationTeams = await queries.ctx.listOrganizationTeams({
    userId: user.id,
    organizationSlug,
  })

  return organizationTeams.map(({ team }) => team)
}

type ListOrganizationMembersParams = {
  organizationSlug: string
}

export async function listOrganizationMembers({
  organizationSlug,
}: ListOrganizationMembersParams) {
  'use cache: private'
  cacheTag('remove-member')

  const { user } = await authenticatedUser()

  const members = await queries.ctx.listOrganizationMembers({
    userId: user.id,
    organizationSlug,
  })

  return members
}

type SetActiveOrganizationTeamParams =
  | {
      organizationId?: string
      teamId?: never
    }
  | {
      organizationId: string
      teamId?: string | null
    }

export async function setActiveOrganizationTeam({
  organizationId,
  teamId,
}: SetActiveOrganizationTeamParams = {}) {
  await auth.api.setActiveOrganization({
    body: { organizationId: organizationId || null },
    headers: await headers(),
  })
  await auth.api.setActiveTeam({
    body: { teamId: teamId || null },
    headers: await headers(),
  })
}
