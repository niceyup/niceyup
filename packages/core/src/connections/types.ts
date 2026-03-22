import type { z } from 'zod'
import type {
  connectionAppSchema,
  connectionAuthenticationSchema,
  connectionGithubSchema,
  connectionMysqlSchema,
  connectionPostgresqlSchema,
  connectionSchemas,
} from './schemas'

export type ConnectionApp = z.infer<typeof connectionAppSchema>

export type ConnectionAuthentication = z.infer<
  typeof connectionAuthenticationSchema
>

export type ConnectionGithub = z.infer<typeof connectionGithubSchema>

export type ConnectionMysql = z.infer<typeof connectionMysqlSchema>

export type ConnectionPostgresql = z.infer<typeof connectionPostgresqlSchema>

export type ConnectionSettings = Record<string, unknown> // TODO: implement a schema for this

export type ConnectionCredentials =
  | ConnectionGithub['credentials']
  | ConnectionMysql['credentials']
  | ConnectionPostgresql['credentials']

export type ConnectionTokens = ConnectionGithub['tokens']

export type ConnectionSchemas = z.infer<typeof connectionSchemas>
