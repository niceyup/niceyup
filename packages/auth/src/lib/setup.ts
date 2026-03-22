import { db } from '@workspace/db'
import {
  members,
  organizations,
  teamMembers,
  teams,
} from '@workspace/db/schema'
import { env } from './env'

export async function setupDefaultIndividualOrganization(user: {
  id: string
  name: string
}) {
  const [firstName] = user.name.split(' ') as [string]
  const firstNameCapitalized =
    firstName.charAt(0).toUpperCase() + firstName.slice(1)
  const unique = Math.random().toString(36).substring(5)

  return await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: `${firstNameCapitalized}\u2018s Individual Org`,
        slug: `${firstNameCapitalized.toLowerCase()}-individual-org-${unique}`,
      })
      .returning({
        id: organizations.id,
      })

    if (!organization) {
      return
    }

    await tx.insert(members).values({
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
    })

    return organization
  })
}

export async function setupDefaultTeam(member: {
  organizationId: string
  userId: string
}) {
  await db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name:
          env.APP_ENV === 'development' ? 'Development Team' : 'Default Team',
        organizationId: member.organizationId,
      })
      .returning({
        id: teams.id,
      })

    if (!team) {
      return
    }

    await tx.insert(teamMembers).values({
      teamId: team.id,
      userId: member.userId,
    })
  })
}
