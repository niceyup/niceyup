import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { invitations, organizations, teams, users } from '../../schema/auth'

type ContextGetInvitationParams = {
  userId: string
}

type GetInvitationParams = {
  invitationId: string
}

export async function getInvitation(
  context: ContextGetInvitationParams,
  params: GetInvitationParams,
) {
  const [user] = await db
    .select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, context.userId))
    .limit(1)

  if (!user) {
    return null
  }

  const [invitation] = await db
    .select({
      id: invitations.id,
      status: invitations.status,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      organization: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
      },
      team: {
        id: teams.id,
        name: teams.name,
      },
      inviter: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
      organizationId: invitations.organizationId,
      teamId: invitations.teamId,
      inviterId: invitations.inviterId,
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .innerJoin(users, eq(invitations.inviterId, users.id))
    .leftJoin(teams, eq(invitations.teamId, teams.id))
    .where(
      and(
        eq(invitations.id, params.invitationId),
        eq(invitations.email, user.email),
      ),
    )
    .limit(1)

  return invitation || null
}

type ContextListPendingInvitationsParams = {
  organizationId: string
}

export async function listPendingInvitations(
  context: ContextListPendingInvitationsParams,
) {
  const listOrganizationPendingInvitations = await db
    .select({
      id: invitations.id,
      status: invitations.status,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      team: {
        id: teams.id,
        name: teams.name,
      },
      inviter: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
      teamId: invitations.teamId,
      inviterId: invitations.inviterId,
    })
    .from(invitations)
    .innerJoin(users, eq(invitations.inviterId, users.id))
    .leftJoin(teams, eq(invitations.teamId, teams.id))
    .where(
      and(
        eq(invitations.organizationId, context.organizationId),
        eq(invitations.status, 'pending'),
      ),
    )
    .orderBy(asc(invitations.expiresAt))

  return listOrganizationPendingInvitations
}
