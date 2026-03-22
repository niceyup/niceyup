import type { z } from 'zod'
import type {
  vectorStoreProviderSchema,
  vectorStoreSchemas,
  vectorStoreUpstashSchema,
} from './schemas'

export type VectorStoreProvider = z.infer<typeof vectorStoreProviderSchema>

export type VectorStoreUpstash = z.infer<typeof vectorStoreUpstashSchema>

export type VectorStoreSettings = VectorStoreUpstash['settings']

export type VectorStoreCredentials = VectorStoreUpstash['credentials']

export type VectorStoreSchemas = z.infer<typeof vectorStoreSchemas>
