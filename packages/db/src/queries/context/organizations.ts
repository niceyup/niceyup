import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { db } from '../../db'
import {
  members,
  organizations,
  teamMembers,
  teams,
  users,
} from '../../schema/auth'

type ContextGetFirstOrganizationParams = {
  userId: string
}

export async function getFirstOrganization(
  context: ContextGetFirstOrganizationParams,
) {
  const [organization] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
    })
    .from(organizations)
    .innerJoin(members, eq(organizations.id, members.organizationId))
    .where(
      and(eq(members.userId, context.userId), isNotNull(organizations.slug)),
    )
    .orderBy(asc(organizations.createdAt))
    .limit(1)

  return organization || null
}

type ContextGetOrganizationParams = {
  userId: string
} & (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
)

export async function getOrganization(context: ContextGetOrganizationParams) {
  const [organization] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      logo: organizations.logo,
      metadata: organizations.metadata,
    })
    .from(organizations)
    .innerJoin(members, eq(organizations.id, members.organizationId))
    .where(
      and(
        context.organizationId !== undefined
          ? eq(organizations.id, context.organizationId)
          : eq(organizations.slug, context.organizationSlug),
        eq(members.userId, context.userId),
      ),
    )
    .limit(1)

  return organization || null
}

type ContextListOrganizationsParams = {
  userId: string
}

export async function listOrganizations(
  context: ContextListOrganizationsParams,
) {
  const listOrganizations = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      logo: organizations.logo,
      metadata: organizations.metadata,
      member: {
        id: members.id,
        role: members.role,
      },
    })
    .from(organizations)
    .innerJoin(members, eq(organizations.id, members.organizationId))
    .where(eq(members.userId, context.userId))
    .orderBy(asc(organizations.createdAt))

  return listOrganizations
}

type ContextGetOrganizationTeamParams = {
  userId: string
} & (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
) & {
    teamId: string
  }

export async function getOrganizationTeam(
  context: ContextGetOrganizationTeamParams,
) {
  const [organizationTeam] = await db
    .select({
      organization: {
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        logo: organizations.logo,
        metadata: organizations.metadata,
      },
      team: {
        id: teams.id,
        name: teams.name,
      },
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .innerJoin(organizations, eq(teams.organizationId, organizations.id))
    .where(
      and(
        eq(teams.id, context.teamId),
        eq(teamMembers.userId, context.userId),
        context.organizationId !== undefined
          ? eq(organizations.id, context.organizationId)
          : eq(organizations.slug, context.organizationSlug),
      ),
    )
    .limit(1)

  return organizationTeam || null
}

type ContextListOrganizationTeamsParams = {
  userId: string
} & (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
)

export async function listOrganizationTeams(
  context: ContextListOrganizationTeamsParams,
) {
  const listOrganizationTeams = await db
    .select({
      organization: {
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        logo: organizations.logo,
        metadata: organizations.metadata,
      },
      team: {
        id: teams.id,
        name: teams.name,
        organizationId: teams.organizationId,
      },
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .innerJoin(organizations, eq(teams.organizationId, organizations.id))
    .where(
      and(
        eq(teamMembers.userId, context.userId),
        context.organizationId !== undefined
          ? eq(organizations.id, context.organizationId)
          : eq(organizations.slug, context.organizationSlug),
      ),
    )
    .orderBy(asc(teams.createdAt))

  return listOrganizationTeams
}

type ContextListOrganizationMembersParams = {
  userId: string
} & (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
)

export async function listOrganizationMembers(
  context: ContextListOrganizationMembersParams,
) {
  const checkAccessToOrganization = await getOrganization(context)

  if (!checkAccessToOrganization) {
    return []
  }

  const listOrganizationMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: members.role,
      memberId: members.id,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(
      and(
        context.organizationId !== undefined
          ? eq(organizations.id, context.organizationId)
          : eq(organizations.slug, context.organizationSlug),
      ),
    )
    .orderBy(asc(members.createdAt))

  return listOrganizationMembers
}

type ContextGetMembershipParams = {
  userId: string
} & (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
)

export async function getMembership(context: ContextGetMembershipParams) {
  const [membership] = await db
    .select({
      id: members.id,
      role: members.role,
      userId: members.userId,
      organizationId: members.organizationId,
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(
      and(
        eq(members.userId, context.userId),
        context.organizationId !== undefined
          ? eq(organizations.id, context.organizationId)
          : eq(organizations.slug, context.organizationSlug),
      ),
    )
    .limit(1)

  if (!membership) {
    return null
  }

  return {
    ...membership,
    isOwner: membership.role === 'owner',
    isBilling: membership.role === 'owner' || membership.role === 'billing',
    isAdmin:
      membership.role === 'owner' ||
      membership.role === 'billing' ||
      membership.role === 'admin',
  }
}

type ContextGetMembershipRoleParams = {
  userId: string
} & (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
)

export async function getMembershipRole(
  context: ContextGetMembershipRoleParams,
) {
  const [member] = await db
    .select({
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(
      and(
        eq(members.userId, context.userId),
        context.organizationId !== undefined
          ? eq(organizations.id, context.organizationId)
          : eq(organizations.slug, context.organizationSlug),
      ),
    )
    .limit(1)

  return {
    role: member?.role || null,
    isOwner: member?.role === 'owner',
    isBilling: member?.role === 'owner' || member?.role === 'billing',
    isAdmin:
      member?.role === 'owner' ||
      member?.role === 'billing' ||
      member?.role === 'admin',
  }
}
