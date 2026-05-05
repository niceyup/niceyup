export type McpServerHeaders = Record<string, string>

export type McpServerCredentials = { apiKey: string }

export type ActiveToolType = undefined | 'function' | 'dynamic' | 'provider'

export type ActiveToolArguments = Record<string, unknown>

export type PromptMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type FileBucket = 'default' | 'engine'

export type FileScope = 'public' | 'conversations' | 'sources'

export type FileMetadata = {
  sentByUserId?: string
  sourceId?: string
}

export type OperationError = {
  code: string
  message: string
}
