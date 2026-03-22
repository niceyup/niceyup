import { z } from 'zod'

// export const mcpServerSchema = z.object({
//   type: z.enum(['http', 'sse']),
//   /**
//    * The URL of the MCP server.
//    */
//   url: z.url(),
//   /**
//    * Additional HTTP headers to be sent with requests.
//    */
//   headers: z.record(z.string(), z.string()).optional(),
// })

export const mcpServerTypeSchema = z.enum(['http', 'sse'])
