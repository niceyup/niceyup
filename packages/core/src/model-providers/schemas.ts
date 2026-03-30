import { z } from 'zod'

export const modelProviderSchema = z.union([
  z.enum(['openai', 'google']),
  z.templateLiteral(['openai-compatible/', z.string().nonempty()]),
])

export const modelProviderSettingsSchema = z.object({
  /**
   * Base URL for the API calls.
   */
  baseURL: z.url(),
  /**
   * Optional custom headers to include in requests. These will be added to request headers
   * after any headers potentially added by use of the `apiKey` option.
   */
  headers: z.record(z.string(), z.string()).optional(),
  /**
   * Optional custom url query parameters to include in request urls.
   */
  queryParams: z.record(z.string(), z.string()).optional(),
})

export const modelProviderOpenAISchema = z.object({
  provider: z.literal('openai'),
  credentials: z.object({
    apiKey: z.string(),
  }),
})

export const modelProviderGoogleSchema = z.object({
  provider: z.literal('google'),
  credentials: z.object({
    apiKey: z.string(),
  }),
})

export const modelProviderOpenAICompatibleSchema = z.object({
  provider: z.templateLiteral(['openai-compatible/', z.string().nonempty()]),
  settings: modelProviderSettingsSchema,
  credentials: z
    .object({
      /**
       * API key for authenticating requests. If specified, adds an `Authorization`
       * header to request headers with the value `Bearer <apiKey>`. This will be added
       * before any headers potentially specified in the `headers` option.
       */
      apiKey: z.string().optional(),
    })
    .optional(),
})

export const modelProviderSchemas = z.union([
  modelProviderOpenAISchema,
  modelProviderGoogleSchema,
  modelProviderOpenAICompatibleSchema,
])
