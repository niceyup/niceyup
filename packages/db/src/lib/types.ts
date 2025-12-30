import type {
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
  AIMessageStatus,
} from '@workspace/ai/types'

export type ModelType = 'language_model' | 'embedding_model'

export type LanguageModelOptions = {
  maxOutputTokens?: number // 100000
  temperature?: number // 2
  topP?: number // 1
  presencePenalty?: number // 2
  frequencyPenalty?: number // 2
  [key: string]: unknown
}

export type EmbeddingModelOptions = {
  [key: string]: unknown
}

export type ModelOptions = LanguageModelOptions | EmbeddingModelOptions

export type PromptMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationVisibility = 'private' | 'shared' | 'team'

export type MessageStatus = AIMessageStatus

export type MessageRole = AIMessageRole

export type MessagePart = AIMessagePart

export type MessageMetadata = AIMessageMetadata

export type FileBucket = 'default' | 'engine'

export type FileScope = 'public' | 'conversations' | 'sources'

export type FileMetadata = {
  sentByUserId?: string
  // agentIds?: string[]
  // conversationIds?: string[]
  sourceId?: string
}

export type SourceType =
  | 'text'
  | 'question-answer'
  | 'website'
  | 'file'
  | 'database'

export type DatabaseSourceDialect = 'postgresql' | 'mysql' | 'sqlite'

export type DatabaseSourceTableMetadata = {
  name: string
  meta?: {
    description?: string
  }
  columns: {
    name: string
    meta?: {
      description?: string
      properNoun?: boolean
    }
    data_type: string
    foreign_table?: string
    foreign_column?: string
  }[]
}

export type DatabaseSourceQueryExample = {
  input: string
  query: string
}

type Provider = {
  openai: {
    apiKey: string
  }
  anthropic: {
    apiKey: string
  }
  google: {
    apiKey: string
  }
  'openai-compatible': {
    providerName: string
    baseURL: string
    apiKey?: string
    headers?: Record<string, string>
    queryParams?: Record<string, string>
  }
}

export type ProviderApp = keyof Provider

export type ProviderPayload = Provider[ProviderApp]

type Connection = {
  github: {
    access_token: string
    [x: string]: unknown
  }
  postgresql: {
    host: string
    port: string
    user: string
    password: string
    database: string
    schema: string
  }
  mysql: {
    host: string
    port: string
    user: string
    password: string
    database: string
  }
}

export type ConnectionApp = keyof Connection

export type ConnectionPayload = Connection[ConnectionApp]
