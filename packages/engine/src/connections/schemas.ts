import { z } from 'zod'

export const connectionAppSchema = z.enum(['github', 'postgresql', 'mysql'])

export const connectionGithubSchema = z.object({
  app: z.literal('github'),
  payload: z.looseObject({
    access_token: z.string(),
  }),
})

export const connectionPostgresqlSchema = z.object({
  app: z.literal('postgresql'),
  payload: z.object({
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
  payload: z.object({
    host: z.string(),
    port: z.string(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
})

export const connectionSchema = z.discriminatedUnion('app', [
  connectionGithubSchema,
])
