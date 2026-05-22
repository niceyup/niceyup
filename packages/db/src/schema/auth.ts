import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { id, timestamps } from '../utils'

export const users = pgTable('users', {
  ...id,
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  stripeCustomerId: text('stripe_customer_id'),
  ...timestamps,
})

export const sessions = pgTable(
  'sessions',
  {
    ...id,
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeOrganizationId: text('active_organization_id'),
    activeTeamId: text('active_team_id'),
    ...timestamps,
  },
  (table) => [index('sessions_userId_idx').on(table.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    ...id,
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('accounts_userId_idx').on(table.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    ...id,
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export const organizations = pgTable(
  'organizations',
  {
    ...id,
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    metadata: text('metadata'),
    stripeCustomerId: text('stripe_customer_id'),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex('organizations_slug_uidx').on(table.slug)],
)

export const teams = pgTable(
  'teams',
  {
    ...id,
    name: text('name').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [index('teams_organizationId_idx').on(table.organizationId)],
)

export const teamMembers = pgTable(
  'team_members',
  {
    ...id,
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index('teamMembers_teamId_idx').on(table.teamId),
    index('teamMembers_userId_idx').on(table.userId),
  ],
)

export const members = pgTable(
  'members',
  {
    ...id,
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').default('member').notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index('members_organizationId_idx').on(table.organizationId),
    index('members_userId_idx').on(table.userId),
  ],
)

export const invitations = pgTable(
  'invitations',
  {
    ...id,
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    teamId: text('team_id'),
    status: text('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index('invitations_organizationId_idx').on(table.organizationId),
    index('invitations_email_idx').on(table.email),
  ],
)

export const apikeys = pgTable(
  'apikeys',
  {
    ...id,
    configId: text('config_id').default('default').notNull(),
    name: text('name'),
    start: text('start'),
    referenceId: text('reference_id').notNull(),
    prefix: text('prefix'),
    key: text('key').notNull(),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at', { withTimezone: true }),
    enabled: boolean('enabled').default(true),
    rateLimitEnabled: boolean('rate_limit_enabled').default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
    rateLimitMax: integer('rate_limit_max').default(10),
    requestCount: integer('request_count').default(0),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    permissions: text('permissions'),
    metadata: text('metadata'),
    ...timestamps,
  },
  (table) => [
    index('apikeys_configId_idx').on(table.configId),
    index('apikeys_referenceId_idx').on(table.referenceId),
    index('apikeys_key_idx').on(table.key),
  ],
)

export const subscriptions = pgTable('subscriptions', {
  ...id,
  plan: text('plan').notNull(),
  currency: text('currency').notNull().default('usd'),
  referenceId: text('reference_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status').default('incomplete'),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  cancelAt: timestamp('cancel_at', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  seats: integer('seats'),
  billingInterval: text('billing_interval'),
  stripeScheduleId: text('stripe_schedule_id'),
})

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  teamMembers: many(teamMembers),
  members: many(members),
  invitations: many(invitations),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  teams: many(teams),
  members: many(members),
  invitations: many(invitations),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organizations: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  teamMembers: many(teamMembers),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  teams: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  users: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}))

export const membersRelations = relations(members, ({ one }) => ({
  organizations: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organizations: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}))
