import { z } from 'zod'

export const vectorStoreProviderSchema = z.enum(['upstash', 'qdrant'])

export const vectorStoreUpstashSchema = z.object({
  provider: z.literal('upstash'),
  settings: z.object({
    url: z.string(),
  }),
  credentials: z.object({
    token: z.string(),
  }),
})

export const vectorStoreQdrantSchema = z.object({
  provider: z.literal('qdrant'),
  settings: z.object({
    url: z.string(),
  }),
  credentials: z.object({
    apiKey: z.string(),
  }),
})

export const vectorStoreSchemas = z.union([
  vectorStoreUpstashSchema,
  vectorStoreQdrantSchema,
])
