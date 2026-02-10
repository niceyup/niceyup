import { polarPlugin } from '@workspace/billing/better-auth'
import { cache } from '@workspace/cache'
import { db, generateId } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { users } from '@workspace/db/schema'
import {
  sendOrganizationInvitation,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '@workspace/email'
import { stripSpecialCharacters } from '@workspace/utils'
import { type BetterAuthOptions, betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { openAPI, organization } from 'better-auth/plugins'
import { ac, roles } from './lib/access'
import { COOKIE_PREFIX } from './lib/constants'
import { env } from './lib/env'
import {
  setupDefaultIndividualOrganization,
  setupDefaultTeamAndAgent,
} from './lib/setup'

const config = {
  appName: 'Niceyup',
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ user, url })
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ user, url })
    },
  },
  socialProviders: {
    github:
      env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          }
        : undefined,
  },
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [env.WEB_URL, env.API_URL],
  advanced: {
    cookiePrefix: COOKIE_PREFIX,
    crossSubDomainCookies: {
      enabled: true,
      domain: new URL(env.WEB_URL).hostname,
    },
    database: { generateId },
  },
  secondaryStorage: {
    get: async (key: string) => {
      return await cache.get(key)
    },
    set: async (key: string, value: string, ttl?: number) => {
      await cache.set(key, value)

      if (ttl) {
        await cache.expire(key, ttl)
      }
    },
    delete: async (key: string) => {
      await cache.del(key)
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const organization = await setupDefaultIndividualOrganization(user)

          if (organization) {
            await setupDefaultTeamAndAgent({
              organizationId: organization.id,
              userId: user.id,
            })
          }
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      teams: {
        enabled: true,
        defaultTeam: {
          enabled: false,
        },
        allowRemovingAllTeams: true,
      },
      cancelPendingInvitationsOnReInvite: true,
      requireEmailVerificationOnInvitation: true,
      invitationExpiresIn: 60 * 60 * 48, // 48 hours
      sendInvitationEmail: async (data) => {
        const url = `${env.WEB_URL}/invitations/${data.id}`
        const expiresIn = '48 hours'

        const [user] = await db
          .select({
            name: users.name,
            image: users.image,
          })
          .from(users)
          .where(eq(users.email, data.email))
          .limit(1)

        await sendOrganizationInvitation({
          organization: data.organization,
          inviter: data.inviter.user,
          user: {
            email: data.email,
            role: data.role,
            name: user?.name,
            image: user?.image,
          },
          url,
          expiresIn,
        })
      },
      organizationHooks: {
        beforeCreateOrganization: async ({ organization }) => {
          return {
            data: {
              ...organization,
              slug: organization.slug
                ? stripSpecialCharacters(organization.slug)
                : undefined,
            },
          }
        },
        afterCreateOrganization: async ({ member }) => {
          await setupDefaultTeamAndAgent(member)
        },
      },
    }),
    polarPlugin(),

    // API Reference for Better Auth
    ...(env.APP_ENV === 'development' ? [openAPI({ path: '/docs' })] : []),
  ],
} satisfies BetterAuthOptions

export const auth = betterAuth(config)
