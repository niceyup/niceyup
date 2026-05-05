import { and, asc, count, eq, sql } from 'drizzle-orm'
import { db } from '../../db'
import { members, teamMembers, teams, users } from '../../schema/auth'

type ContextGetTeamParams = {
  userId?: string | null
  organizationId: string
}

type GetTeamParams = {
  teamId: string
}

export async function getTeam(
  context: ContextGetTeamParams,
  params: GetTeamParams,
) {
  const selectQuery = db
    .select({
      id: teams.id,
      name: teams.name,
      organizationId: teams.organizationId,
    })
    .from(teams)

  if (context.userId) {
    const [team] = await selectQuery
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(
          eq(teams.organizationId, context.organizationId),
          eq(teamMembers.userId, context.userId),
        ),
      )
      .limit(1)

    return team || null
  }

  const [team] = await selectQuery
    .where(
      and(
        eq(teams.id, params.teamId),
        eq(teams.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return team || null
}

type ContextListTeamsParams = {
  userId?: string | null
  organizationId: string
}

export async function listTeams(context: ContextListTeamsParams) {
  const teamMembersCountSubQuery = db
    .select({
      teamId: teamMembers.teamId,
      teamMembersCount: count().as('team_members_count'),
    })
    .from(teamMembers)
    .groupBy(teamMembers.teamId)
    .as('team_members_count')

  const selectQuery = db
    .select({
      id: teams.id,
      name: teams.name,
      memberCount:
        sql<number>`CAST(COALESCE(${teamMembersCountSubQuery.teamMembersCount}, 0) AS integer)`.as(
          'memberCount',
        ),
      organizationId: teams.organizationId,
    })
    .from(teams)
    .leftJoin(
      teamMembersCountSubQuery,
      eq(teams.id, teamMembersCountSubQuery.teamId),
    )

  if (context.userId) {
    const listTeams = await selectQuery
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(
          eq(teams.organizationId, context.organizationId),
          eq(teamMembers.userId, context.userId),
        ),
      )
      .orderBy(asc(teams.createdAt))

    return listTeams
  }

  const listTeams = await selectQuery
    .where(eq(teams.organizationId, context.organizationId))
    .orderBy(asc(teams.createdAt))

  return listTeams
}

type ContextListTeamMembersParams = {
  userId?: string | null
  organizationId: string
}

type ListTeamMembersParams = {
  teamId: string
}

export async function listTeamMembers(
  context: ContextListTeamMembersParams,
  params: ListTeamMembersParams,
) {
  const checkAccessToTeam = await getTeam(context, {
    teamId: params.teamId,
  })

  if (!checkAccessToTeam) {
    return []
  }

  const listTeamMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: members.role,
      teamMemberId: teamMembers.id,
      memberId: members.id,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .innerJoin(members, eq(users.id, members.userId))
    .where(
      and(
        eq(teamMembers.teamId, params.teamId),
        eq(teams.organizationId, context.organizationId),
        eq(members.organizationId, context.organizationId),
      ),
    )
    .orderBy(asc(teamMembers.createdAt))

  return listTeamMembers
}
