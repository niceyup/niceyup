import { BadRequestError } from '@/http/errors/bad-request-error'
import { queries } from '@workspace/db/queries'

export async function resolveMembershipContext({
  userId,
  organizationId,
  organizationSlug,
  teamId,
}: {
  userId: string
  organizationId?: string | null
  organizationSlug?: string | null
  teamId?: string | null
}) {
  let organization = null
  let team = null

  const _organizationId =
    organizationId ||
    (await queries.getOrganizationIdBySlug({ organizationSlug }))
  const _teamId = teamId !== '~' ? teamId : null

  if (_organizationId) {
    if (_teamId) {
      const organizationTeam = await queries.context.getOrganizationTeam(
        { userId },
        { organizationId: _organizationId, teamId: _teamId },
      )

      organization = organizationTeam?.organization || null
      team = organizationTeam?.team || null
    } else {
      organization = await queries.context.getOrganization(
        { userId },
        { organizationId: _organizationId },
      )
    }
  }

  if (!organization) {
    if (_teamId && !team) {
      throw new BadRequestError({
        code: 'ORGANIZATION_TEAM_NOT_FOUND',
        message: 'Organization team not found',
      })
    }

    throw new BadRequestError({
      code: 'ORGANIZATION_NOT_FOUND',
      message: 'Organization not found',
    })
  }

  const membership = await queries.context.getMembership({
    userId,
    organizationId: organization.id,
  })

  if (!membership) {
    throw new BadRequestError({
      code: 'MEMBERSHIP_NOT_FOUND',
      message: 'Membership not found',
    })
  }

  const context = {
    userId,
    organizationId: organization.id,
    teamId: team?.id || null,
    isAdmin: membership.isAdmin,
  }

  return { context, membership, organization, team: team || null }
}
