import type { z } from 'zod'
import type { knowledgeBaseStatusSchema } from './schemas'

export type KnowledgeBaseStatus = z.infer<typeof knowledgeBaseStatusSchema>
