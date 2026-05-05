import { z } from 'zod'

export const conversationVisibilitySchema = z.enum([
  'private',
  'shared',
  'team',
])

// Conversation Explorer Nodes

export const conversationExplorerNodeTypeSchema = z.enum([
  'folder',
  'conversation',
])
