import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
} from '@workspace/ai/types'

export type AIMessageNode = Omit<AIMessage, 'parts' | 'metadata'> & {
  temporaryId?: string
  parts: AIMessagePart[] | null
  metadata: AIMessageMetadata | null
  parentId?: string | null
  children?: string[]
}
