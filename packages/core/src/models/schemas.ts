import { z } from 'zod'

export const modelTypeSchema = z.enum(['language-model', 'embedding-model'])

export const languageModelSettingsSchema = z.object({
  type: z.literal('language-model'),
  options: z.looseObject({
    maxOutputTokens: z.number().optional(), // 100000
    temperature: z.number().optional(), // 2
    topP: z.number().optional(), // 1
    presencePenalty: z.number().optional(), // 2
    frequencyPenalty: z.number().optional(), // 2
  }),
})

export const embeddingModelSettingsSchema = z.object({
  type: z.literal('embedding-model'),
  options: z.looseObject({}),
})
