import { z } from 'zod'

export const providerSchema = z.enum(['openai', 'google'])

export const providerOpenAISchema = z.object({
  provider: z.literal('openai'),
  credentials: z.object({
    apiKey: z.string(),
  }),
})

export const providerGoogleSchema = z.object({
  provider: z.literal('google'),
  credentials: z.object({
    apiKey: z.string(),
  }),
})

// export const providerOpenAICompatibleSchema = z.object({
//   provider: z.string().startsWith('openai-compatible/'),
//   settings: z.object({
//     /**
//      * Base URL for the API calls.
//      */
//     baseURL: z.url(),
//     /**
//      * Optional custom headers to include in requests. These will be added to request headers
//      * after any headers potentially added by use of the `apiKey` option.
//      */
//     headers: z.record(z.string(), z.string()).optional(),
//     /**
//      * Optional custom url query parameters to include in request urls.
//      */
//     queryParams: z.record(z.string(), z.string()).optional(),
//   }),
//   credentials: z
//     .object({
//       /**
//        * API key for authenticating requests. If specified, adds an `Authorization`
//        * header to request headers with the value `Bearer <apiKey>`. This will be added
//        * before any headers potentially specified in the `headers` option.
//        */
//       apiKey: z.string().optional(),
//     })
//     .optional(),
// })
