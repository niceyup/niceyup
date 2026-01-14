import { z } from 'zod'
import {
  embeddingModelSettingsSchema,
  languageModelSettingsSchema,
} from './schemas'

const modelSettingsSchemas = z.discriminatedUnion('type', [
  languageModelSettingsSchema,
  embeddingModelSettingsSchema,
])

type ModelSettingsSchemas = z.infer<typeof modelSettingsSchemas>

export function validateModelSettings({
  type,
  ...data
}: Partial<ModelSettingsSchemas>) {
  return modelSettingsSchemas.parse({ type, ...data })
}
