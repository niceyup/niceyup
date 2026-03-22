import type { z } from 'zod'
import type {
  modelProviderGoogleSchema,
  modelProviderOpenAICompatibleSchema,
  modelProviderOpenAISchema,
  modelProviderSchema,
  modelProviderSchemas,
  modelProviderSettingsSchema,
} from './schemas'

export type ModelProvider = z.infer<typeof modelProviderSchema>

export type ModelProviderSettings = z.infer<typeof modelProviderSettingsSchema>

export type ModelProviderOpenAICredentials = z.infer<
  typeof modelProviderOpenAISchema
>

export type ModelProviderGoogleCredentials = z.infer<
  typeof modelProviderGoogleSchema
>

export type ModelProviderOpenAICompatibleCredentials = z.infer<
  typeof modelProviderOpenAICompatibleSchema
>

export type ModelProviderCredentials =
  | ModelProviderOpenAICredentials['credentials']
  | ModelProviderGoogleCredentials['credentials']
  | ModelProviderOpenAICompatibleCredentials['credentials']

export type ModelProviderSchemas = z.infer<typeof modelProviderSchemas>
