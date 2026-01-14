import { z } from 'zod'

export const connectionAppSchema = z.enum(['github', 'postgresql', 'mysql'])

// export const connectionAuthorizationSchema = z.enum([
//   'api-key',
//   'bearer-token',
//   'basic-auth',
//   'oauth2',
//   'custom',
// ])

export const connectionGithubSchema = z.object({
  app: z.literal('github'),
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
  credentials: z.object({
    host: z.string(),
    port: z.string(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
})
