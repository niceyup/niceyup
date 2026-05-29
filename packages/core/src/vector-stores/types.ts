import type { z } from 'zod'
import type {
  vectorStoreProviderSchema,
  vectorStoreQdrantSchema,
  vectorStoreSchemas,
  vectorStoreUpstashSchema,
} from './schemas'

export type VectorStoreProvider = z.infer<typeof vectorStoreProviderSchema>

export type VectorStoreUpstash = z.infer<typeof vectorStoreUpstashSchema>

export type VectorStoreQdrant = z.infer<typeof vectorStoreQdrantSchema>

export type VectorStoreSettings =
  | VectorStoreUpstash['settings']
  | VectorStoreQdrant['settings']

export type VectorStoreCredentials =
  | VectorStoreUpstash['credentials']
  | VectorStoreQdrant['credentials']

export type VectorStoreSchemas = z.infer<typeof vectorStoreSchemas>
