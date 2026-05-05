import type { ApiKey } from '@better-auth/api-key'
import { AuthError } from '@workspace/core/errros'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import {
  members,
  organizations,
  teamMembers,
  teams,
  users,
} from '@workspace/db/schema'
import type { auth } from '../auth'

////////////////////////////////////////////////////
// Internal Context
////////////////////////////////////////////////////

export type Context<With = unknown> = With & {
  user?: User
  organization?: Organization
  membership?: Membership
  team?: Team
}

type User = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  stripeCustomerId?: string | null
}
type Organization = {
  id: string
  name: string
  slug: string
  logo: string | null
  stripeCustomerId: string | null
}

type Team = {
  id: string
  name: string
  organizationId: string
}

type Membership = {
  id: string
  userId: string
  organizationId: string
  role: string
}

////////////////////////////////////////////////////
// Auth Context
////////////////////////////////////////////////////

export type WithAuthContext = {
  auth?: AuthContext
}

export type AuthContext = {
  authSession?: typeof auth.$Infer.Session
  apiKey?: Omit<ApiKey, 'key'>
}

type Subject = 'user' | 'organization'

type Permissions = {
  [key: string]: string[]
}

export type ResolveAuthContextParams<SUBJECT extends Subject = Subject> = {
  subject?: SUBJECT | [SUBJECT, ...SUBJECT[]]
  permissions?: Permissions
}

export type ResolveAuthContextResult = {
  user: {
    subject: 'user'
    user: User
    organization: null
  }
  organization: {
    subject: 'organization'
    user: null
    organization: Organization
  }
}

export async function resolveAuthContext<SUBJECT extends Subject>(
  context: Context<WithAuthContext>,
  params?: ResolveAuthContextParams<SUBJECT>,
): Promise<ResolveAuthContextResult[SUBJECT]>

export async function resolveAuthContext(
  context: Context<WithAuthContext>,
  params: ResolveAuthContextParams = {},
): Promise<ResolveAuthContextResult[Subject]> {
  if (context.user) {
    return {
      subject: 'user' as const,
      user: context.user,
      organization: null,
    }
  }

  if (context.organization) {
    return {
      subject: 'organization' as const,
      user: null,
      organization: context.organization,
    }
  }

  if (!context.auth) {
    throw new AuthError({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
  }

  const subjects = params.subject
    ? Array.isArray(params.subject)
      ? params.subject
      : [params.subject]
    : null

  if (context.auth.authSession) {
    if (subjects && !subjects.includes('user')) {
      throw new AuthError({
        code: 'AUTH_TYPE_NOT_ALLOWED',
        message: 'Authentication type "user" not allowed',
      })
    }

    context.user = context.auth.authSession.user

    return {
      subject: 'user' as const,
      user: context.user,
      organization: null,
    }
  }

  if (context.auth.apiKey) {
    if (context.auth.apiKey.configId === 'user') {
      if (subjects && !subjects.includes('user')) {
        throw new AuthError({
          code: 'AUTH_TYPE_NOT_ALLOWED',
          message: 'Authentication type "user" not allowed',
        })
      }

      if (params.permissions && context.auth.apiKey.permissions) {
        const hasPermissions = hasRequiredPermissions(
          params.permissions,
          context.auth.apiKey.permissions,
        )

        if (!hasPermissions) {
          throw new AuthError({
            code: 'API_KEY_PERMISSION_DENIED',
            message: 'API key does not have required permissions',
          })
        }
      }

      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          stripeCustomerId: users.stripeCustomerId,
        })
        .from(users)
        .where(eq(users.id, context.auth.apiKey.referenceId))
        .limit(1)

      if (!user) {
        throw new AuthError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })
      }

      context.user = user

      return {
        subject: 'user' as const,
        user: context.user,
        organization: null,
      }
    }

    if (context.auth.apiKey.configId === 'organization') {
      if (subjects && !subjects.includes('organization')) {
        throw new AuthError({
          code: 'AUTH_TYPE_NOT_ALLOWED',
          message: 'Authentication type "organization" not allowed',
        })
      }

      if (params.permissions && context.auth.apiKey.permissions) {
        const hasPermissions = hasRequiredPermissions(
          params.permissions,
          context.auth.apiKey.permissions,
        )

        if (!hasPermissions) {
          throw new AuthError({
            code: 'API_KEY_PERMISSION_DENIED',
            message: 'API key does not have required permissions',
          })
        }
      }

      const [organization] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          logo: organizations.logo,
          stripeCustomerId: organizations.stripeCustomerId,
        })
        .from(organizations)
        .where(eq(organizations.id, context.auth.apiKey.referenceId))
        .limit(1)

      if (!organization) {
        throw new AuthError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })
      }

      context.organization = organization

      return {
        subject: 'organization' as const,
        user: null,
        organization: context.organization,
      }
    }
  }

  throw new AuthError({
    code: 'INVALID_API_KEY',
    message: 'Invalid API key',
  })
}

function hasRequiredPermissions(
  requiredPermissions: Record<string, string[]>,
  apiKeyPermissions: Record<string, string[]>,
) {
  for (const [resource, requiredActions] of Object.entries(
    requiredPermissions,
  )) {
    const allowedActions = apiKeyPermissions[resource]

    if (!allowedActions) {
      return false
    }

    for (const action of requiredActions) {
      if (!allowedActions.includes(action)) {
        return false
      }
    }
  }

  return true
}

////////////////////////////////////////////////////
// Organization/Team Context
////////////////////////////////////////////////////

type ResolveOrganizationContextParams = {
  organizationId?: string | null
  organizationSlug?: string | null
}

export async function resolveOrganizationContext(
  context: Context,
  params: ResolveOrganizationContextParams = {},
): Promise<{
  organization: Organization
}> {
  if (context.organization) {
    if (
      params.organizationId &&
      params.organizationId !== context.organization.id
    ) {
      throw new AuthError({
        code: 'ORGANIZATION_ID_MISMATCH',
        message: 'Organization ID mismatch',
      })
    }

    if (
      params.organizationSlug &&
      params.organizationSlug !== context.organization.slug
    ) {
      throw new AuthError({
        code: 'ORGANIZATION_SLUG_MISMATCH',
        message: 'Organization slug mismatch',
      })
    }

    return { organization: context.organization }
  }

  if (!context.user) {
    throw new AuthError({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
  }

  if (!params.organizationId && !params.organizationSlug) {
    throw new AuthError({
      code: 'ORGANIZATION_ID_OR_SLUG_REQUIRED',
      message: 'Organization ID or slug is required',
    })
  }

  const [organization] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      logo: organizations.logo,
      stripeCustomerId: organizations.stripeCustomerId,
    })
    .from(organizations)
    .innerJoin(members, eq(organizations.id, members.organizationId))
    .where(
      and(
        params.organizationId
          ? eq(organizations.id, params.organizationId)
          : eq(organizations.slug, params.organizationSlug as string),
        eq(members.userId, context.user.id),
      ),
    )
    .limit(1)

  if (!organization) {
    throw new AuthError({
      code: 'ORGANIZATION_NOT_FOUND',
      message: 'Organization not found or you don’t have access ',
    })
  }

  context.organization = organization

  return { organization: context.organization }
}

type ResolveTeamContextParams = {
  teamId?: string | null
}

export async function resolveTeamContext(
  context: Context,
  params: ResolveTeamContextParams = {},
): Promise<{
  team: Team | null
}> {
  if (!context.organization) {
    throw new AuthError({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
  }

  if (context.team) {
    if (
      params.teamId &&
      params.teamId !== '~' &&
      params.teamId !== context.team.id
    ) {
      throw new AuthError({
        code: 'TEAM_ID_MISMATCH',
        message: 'Team ID mismatch',
      })
    }

    return { team: context.team }
  }

  if (!params.teamId || params.teamId === '~') {
    return { team: null }
  }

  if (context.user) {
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        organizationId: teams.organizationId,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(
          eq(teams.id, params.teamId),
          eq(teams.organizationId, context.organization.id),
          eq(teamMembers.userId, context.user.id),
        ),
      )
      .limit(1)

    if (!team) {
      throw new AuthError({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found or you don’t have access',
      })
    }

    context.team = team

    return { team: context.team }
  }

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      organizationId: teams.organizationId,
    })
    .from(teams)
    .where(
      and(
        eq(teams.id, params.teamId),
        eq(teams.organizationId, context.organization.id),
      ),
    )
    .limit(1)

  if (!team) {
    throw new AuthError({
      code: 'TEAM_NOT_FOUND',
      message: 'Team not found or you don’t have access',
    })
  }

  context.team = team

  return { team: context.team }
}

////////////////////////////////////////////////////
// Membership Context
////////////////////////////////////////////////////

const ROLES = {
  owner: ['owner', 'billing', 'admin', 'member'],
  billing: ['billing', 'admin', 'member'],
  admin: ['admin', 'member'],
  member: ['member'],
}

type Role = 'owner' | 'billing' | 'admin' | 'member'

type ResolveMembershipContextParams = {
  role?: Role
}

export async function resolveMembershipContext(
  context: Context,
  params: ResolveMembershipContextParams = {},
): Promise<{
  user: User
  organization: Organization
  membership: Membership
}> {
  if (!context.user) {
    throw new AuthError({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
  }

  if (!context.organization) {
    throw new AuthError({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
  }

  if (context.membership) {
    return {
      user: context.user,
      organization: context.organization,
      membership: context.membership,
    }
  }

  const roles = params.role
    ? Array.isArray(params.role)
      ? params.role
      : [params.role]
    : null

  const [membership] = await db
    .select({
      id: members.id,
      userId: members.userId,
      organizationId: members.organizationId,
      role: members.role,
    })
    .from(members)
    .where(
      and(
        eq(members.userId, context.user.id),
        eq(members.organizationId, context.organization.id),
      ),
    )
    .limit(1)

  if (!membership) {
    throw new AuthError({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
  }

  if (roles) {
    const allowedRoles = ROLES[membership.role as Role]

    if (!allowedRoles.includes(membership.role)) {
      throw new AuthError({
        code: 'MEMBERSHIP_ROLE_NOT_ALLOWED',
        message: 'Membership role not allowed',
      })
    }
  }

  context.membership = membership

  return {
    user: context.user,
    organization: context.organization,
    membership: context.membership,
  }
}

////////////////////////////////////////////////////
// Auth Organization Context
////////////////////////////////////////////////////

export type ResolveAuthOrganizationContextParams<
  SUBJECT extends Subject = Subject,
> = {
  auth?: {
    subject?: SUBJECT | [SUBJECT, ...SUBJECT[]]
    permissions?: Permissions
  }
  membership?: {
    role?: Role
  }
  params?: {
    organizationId?: string | null
    organizationSlug?: string | null
    teamId?: string | null
  }
}

export type ResolveAuthOrganizationContextResult = {
  user: {
    subject: 'user'
    user: User
    organization: Organization
    team: Team | null
    membership: Membership
  }
  organization: {
    subject: 'organization'
    user: null
    organization: Organization
    team: Team | null
    membership: null
  }
}

export async function resolveAuthOrganizationContext<SUBJECT extends Subject>(
  context: Context<WithAuthContext>,
  params?: ResolveAuthOrganizationContextParams<SUBJECT>,
): Promise<ResolveAuthOrganizationContextResult[SUBJECT]>

export async function resolveAuthOrganizationContext(
  context: Context<WithAuthContext>,
  params: ResolveAuthOrganizationContextParams = {},
): Promise<ResolveAuthOrganizationContextResult[Subject]> {
  const { subject, user } = await resolveAuthContext(context, {
    subject: params.auth?.subject,
    permissions: params.auth?.permissions,
  })

  const { organization } = await resolveOrganizationContext(context, {
    organizationId: params.params?.organizationId,
    organizationSlug: params.params?.organizationSlug,
  })

  const { team } = await resolveTeamContext(context, {
    teamId: params.params?.teamId,
  })

  if (subject === 'user') {
    const { membership } = await resolveMembershipContext(context, {
      role: params.membership?.role,
    })

    return {
      subject: 'user',
      user: user,
      organization: organization,
      team: team,
      membership: membership,
    }
  }

  return {
    subject: 'organization',
    user: null,
    organization: organization,
    team: null,
    membership: null,
  }
}
