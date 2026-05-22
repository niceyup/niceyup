import { apiKey } from '@better-auth/api-key'
import { billing } from '@workspace/billing'
import { stripePlugin } from '@workspace/billing/better-auth'
import { LIMITS } from '@workspace/billing/constants'
import { cache } from '@workspace/cache'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { users } from '@workspace/db/schema'
import { email } from '@workspace/email'
import { generateId, stripSpecialCharacters } from '@workspace/utils'
import { type BetterAuthOptions, betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { openAPI, organization } from 'better-auth/plugins'
import { ac, roles } from './lib/access'
import { apiKeyConfigs } from './lib/api-key'
import { COOKIE_PREFIX } from './lib/constants'
import { env } from './lib/env'
import {
  setupDefaultIndividualOrganization,
  setupDefaultTeam,
} from './lib/setup'

const config = {
  appName: 'Niceyup',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.WEB_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await email.sendVerificationEmail({ user, url })
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await email.sendPasswordResetEmail({ user, url })
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
      domain: new URL(
        env.WEB_URL ?? process.env.WEB_URL ?? 'http://localhost:3000',
      ).hostname,
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
            await setupDefaultTeam({
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
      membershipLimit: async (_user, organization) => {
        const subscription = await billing.subscriptions.getSubscription({
          referenceId: organization.id,
        })

        const seats = LIMITS[subscription?.plan ?? 'hobby']?.seats.value ?? 1

        return seats
      },
      ac,
      roles,
      teams: {
        enabled: true,
        defaultTeam: {
          enabled: false,
        },
        allowRemovingAllTeams: true,
      },
      invitationExpiresIn: 60 * 60 * 48, // 48 hours
      cancelPendingInvitationsOnReInvite: true,
      requireEmailVerificationOnInvitation: true,
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

        await email.sendOrganizationInvitation({
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
          await setupDefaultTeam(member)
        },
      },
    }),
    apiKey([
      {
        configId: apiKeyConfigs.user.configId,
        defaultPrefix: apiKeyConfigs.user.defaultPrefix,
        references: apiKeyConfigs.user.references, // Default - owned by users
      },
      {
        configId: apiKeyConfigs.organization.configId,
        defaultPrefix: apiKeyConfigs.organization.defaultPrefix,
        references: apiKeyConfigs.organization.references, // Owned by organizations
      },
    ]),
    stripePlugin(),

    // API Reference for Better Auth
    ...(env.APP_ENV === 'development' ? [openAPI({ path: '/docs' })] : []),
  ],
} satisfies BetterAuthOptions

export const auth = betterAuth(config)
