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

export type ModelProviderOpenAI = z.infer<typeof modelProviderOpenAISchema>

export type ModelProviderGoogle = z.infer<typeof modelProviderGoogleSchema>

export type ModelProviderOpenAICompatible = z.infer<
  typeof modelProviderOpenAICompatibleSchema
>

export type ModelProviderCredentials =
  | ModelProviderOpenAI['credentials']
  | ModelProviderGoogle['credentials']
  | ModelProviderOpenAICompatible['credentials']

export type ModelProviderSchemas = z.infer<typeof modelProviderSchemas>
