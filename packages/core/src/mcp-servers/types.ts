import type { z } from 'zod'
import type { mcpServerTypeSchema } from './schemas'

export type McpServerType = z.infer<typeof mcpServerTypeSchema>
