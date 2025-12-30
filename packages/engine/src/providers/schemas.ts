import { z } from 'zod'

export const providerAppSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'openai-compatible',
])

export const providerOpenAISchema = z.object({
  app: z.literal('openai'),
  payload: z.object({
    apiKey: z.string(),
  }),
})

export const providerAnthropicSchema = z.object({
  app: z.literal('anthropic'),
  payload: z.object({
    apiKey: z.string(),
  }),
})

export const providerGoogleSchema = z.object({
  app: z.literal('google'),
  payload: z.object({
    apiKey: z.string(),
  }),
})

export const providerOpenAICompatibleSchema = z.object({
  app: z.literal('openai-compatible'),
  payload: z.object({
    /**
     * Provider name.
     */
    providerName: z.string(),

    /**
     * Base URL for the API calls.
     */
    baseURL: z.url(),

    /**
     * API key for authenticating requests. If specified, adds an `Authorization`
     * header to request headers with the value `Bearer <apiKey>`. This will be added
     * before any headers potentially specified in the `headers` option.
     */
    apiKey: z.string().optional(),

    /**
     * Optional custom headers to include in requests. These will be added to request headers
     * after any headers potentially added by use of the `apiKey` option.
     */
    headers: z.record(z.string(), z.string()).optional(),

    /**
     * Optional custom url query parameters to include in request urls.
     */
    queryParams: z.record(z.string(), z.string()).optional(),
  }),
})

export const providerSchema = z.discriminatedUnion('app', [
  providerOpenAISchema,
  providerAnthropicSchema,
  providerGoogleSchema,
  providerOpenAICompatibleSchema,
])
