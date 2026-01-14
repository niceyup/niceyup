import { z } from 'zod'
import {
  connectionGithubSchema,
  connectionMysqlSchema,
  connectionPostgresqlSchema,
} from './schemas'

const connectionSchemas = z.discriminatedUnion('app', [
  connectionGithubSchema,
  connectionPostgresqlSchema,
  connectionMysqlSchema,
])

type ConnectionSchemas = z.infer<typeof connectionSchemas>

export function validateConnection({
  app,
  ...data
}: Partial<ConnectionSchemas> & { credentials?: any; tokens?: any }) {
  return connectionSchemas.parse({ app, ...data })
}
