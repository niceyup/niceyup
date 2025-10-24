import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from 'ai'

export type AIMessageMetadata = {
  triggerTask?: {
    id: string
    taskIdentifier: string
  }
  authorId?: string
  error?: any
}

export type AIMessageRole = 'system' | 'user' | 'assistant'

export type AIMessageStatus =
  | 'queued'
  | 'processing'
  | 'finished'
  | 'stopped'
  | 'failed'

export type AIMessage<
  METADATA = AIMessageMetadata,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = UIMessage<METADATA, DATA_PARTS, TOOLS> & {
  status: AIMessageStatus
}

export type AIMessagePart<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = UIMessagePart<DATA_TYPES, TOOLS>
