export type PromptMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type FileBucket = 'default' | 'engine'

export type FileScope = 'public' | 'conversations' | 'sources'

export type FileMetadata = {
  sentByUserId?: string
  // agentIds?: string[]
  // conversationIds?: string[]
  sourceId?: string
}

export type OperationError = {
  code: string
  message: string
}
