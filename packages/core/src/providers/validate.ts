import { z } from 'zod'
import { providerGoogleSchema, providerOpenAISchema } from './schemas'

const providerSchemas = z.discriminatedUnion('provider', [
  providerOpenAISchema,
  providerGoogleSchema,
])

type ProviderSchemas = z.infer<typeof providerSchemas>

export function validateProvider({
  provider,
  ...data
}: Partial<ProviderSchemas> & { credentials?: any }) {
  return providerSchemas.parse({ provider, ...data })
}
