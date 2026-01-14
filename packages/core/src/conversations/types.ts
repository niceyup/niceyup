import type { z } from 'zod'
import type { conversationVisibilitySchema } from './schemas'

export type ConversationVisibility = z.infer<
  typeof conversationVisibilitySchema
>
