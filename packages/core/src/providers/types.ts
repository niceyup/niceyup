import type { z } from 'zod'
import type {
  providerGoogleSchema,
  providerOpenAISchema,
  providerSchema,
} from './schemas'

export type Provider = z.infer<typeof providerSchema>

export type ProviderOpenAICredentials = z.infer<typeof providerOpenAISchema>

export type ProviderGoogleCredentials = z.infer<typeof providerGoogleSchema>

export type ProviderCredentials =
  | ProviderOpenAICredentials['credentials']
  | ProviderGoogleCredentials['credentials']
