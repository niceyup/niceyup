import { z } from 'zod'

export const knowledgeBaseStatusSchema = z.enum(['ready', 'reindexing'])
