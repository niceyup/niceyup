import { z } from 'zod'

export const connectionAppSchema = z.enum(['github', 'postgresql', 'mysql'])

export const connectionAuthenticationSchema = z.enum([
  'api-key',
  'bearer-token',
  'basic-auth',
  'oauth2',
  'custom',
])

export const connectionGithubSchema = z.object({
  app: z.literal('github'),
  authentication: z.literal('oauth2'),
  credentials: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
  }),
  tokens: z.looseObject({
    access_token: z.string(),
  }),
})

export const connectionPostgresqlSchema = z.object({
  app: z.literal('postgresql'),
  authentication: z.literal('custom'),
  credentials: z.object({
    host: z.string(),
    port: z.string(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
    schema: z.string(),
  }),
})

export const connectionMysqlSchema = z.object({
  app: z.literal('mysql'),
  authentication: z.literal('custom'),
  credentials: z.object({
    host: z.string(),
    port: z.string(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
})

export const connectionSchemas = z.discriminatedUnion('app', [
  connectionGithubSchema,
  connectionPostgresqlSchema,
  connectionMysqlSchema,
])
