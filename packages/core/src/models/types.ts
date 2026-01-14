import type { z } from 'zod'
import type {
  embeddingModelSettingsSchema,
  languageModelSettingsSchema,
  modelTypeSchema,
} from './schemas'

export type ModelType = z.infer<typeof modelTypeSchema>

export type LanguageModelSettings = z.infer<typeof languageModelSettingsSchema>

export type EmbeddingModelSettings = z.infer<
  typeof embeddingModelSettingsSchema
>

export type ModelSettingsOptions =
  | LanguageModelSettings['options']
  | EmbeddingModelSettings['options']
