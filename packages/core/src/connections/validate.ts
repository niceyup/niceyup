import { connectionSchemas } from './schemas'
import type { ConnectionSchemas } from './types'

export function validateConnection({
  app,
  ...data
}: Partial<ConnectionSchemas> & {
  authentication?: any
  settings?: any
  credentials?: any
  tokens?: any
}) {
  return connectionSchemas.parse({ app, ...data })
}
