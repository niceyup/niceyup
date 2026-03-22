import { z } from 'zod'

export const vectorStoreProviderSchema = z.enum(['upstash'])

export const vectorStoreUpstashSchema = z.object({
  provider: z.literal('upstash'),
  settings: z.object({
    url: z.string(),
  }),
  credentials: z.object({
    token: z.string(),
  }),
})

export const vectorStoreSchemas = z.discriminatedUnion('provider', [
  vectorStoreUpstashSchema,
])
