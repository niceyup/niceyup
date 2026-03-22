import { vectorStoreSchemas } from './schemas'
import type { VectorStoreSchemas } from './types'

export function validateVectorStore({
  provider,
  ...data
}: Partial<VectorStoreSchemas> & {
  settings?: any
  credentials?: any
}) {
  return vectorStoreSchemas.parse({ provider, ...data })
}
