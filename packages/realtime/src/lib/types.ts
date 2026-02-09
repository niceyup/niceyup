import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
} from '@workspace/ai/types'

export type RealtimePayload<T> = {
  channel: string
  data: T
}

export type AIMessageNode = Omit<AIMessage, 'parts' | 'metadata'> & {
  temporaryId?: string
  parts: AIMessagePart[] | null
  metadata: AIMessageMetadata | null
  parentId?: string | null
  children?: string[]
}

export type ConversationsView = 'list' | 'explorer'

export type ConversationEvent =
  | {
      action: 'create' | 'update'
      conversation: {
        id: string
        title: string
        updatedAt: string
      }
    }
  | {
      action: 'delete'
      conversation: {
        id: string
      }
    }

export type ConversationExplorerNodeEvent = {
  action: 'create' | 'update' | 'delete'
  item: {
    id: string
    parentId: string | null
  }
}
