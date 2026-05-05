import type { z } from 'zod'
import type {
  conversationExplorerNodeTypeSchema,
  conversationVisibilitySchema,
} from './schemas'

export type ConversationVisibility = z.infer<
  typeof conversationVisibilitySchema
>

// Conversation Explorer Nodes

export type ConversationExplorerNodeType = z.infer<
  typeof conversationExplorerNodeTypeSchema
>
