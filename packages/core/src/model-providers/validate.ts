import { modelProviderSchemas } from './schemas'
import type { ModelProviderSchemas } from './types'

export function validateModelProvider({
  provider,
  ...data
}: Partial<ModelProviderSchemas> & {
  settings?: any
  credentials?: any
}) {
  return modelProviderSchemas.parse({ provider, ...data })
}
