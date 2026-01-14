import type { z } from 'zod'
import type {
  connectionAppSchema,
  connectionGithubSchema,
  connectionMysqlSchema,
  connectionPostgresqlSchema,
} from './schemas'

export type ConnectionApp = z.infer<typeof connectionAppSchema>

export type ConnectionGithub = z.infer<typeof connectionGithubSchema>

export type ConnectionMysql = z.infer<typeof connectionMysqlSchema>

export type ConnectionPostgresql = z.infer<typeof connectionPostgresqlSchema>

export type ConnectionCredentials =
  | ConnectionGithub['credentials']
  | ConnectionMysql['credentials']
  | ConnectionPostgresql['credentials']

export type ConnectionTokens = ConnectionGithub['tokens']
