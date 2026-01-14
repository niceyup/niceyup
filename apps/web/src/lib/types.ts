import type {
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
  AIMessageStatus,
} from '@workspace/ai/types'

export type OrganizationTeamParams = {
  organizationSlug: '$slug'
  teamId: '~' | '$id'
}

export type AgentParams = {
  agentId: '$id'
}

export type ChatParams = {
  chatId: 'new' | '$id'
}

export type Organization = {
  id: string
  slug: string
  name: string
  logo?: string | null
  metadata?: unknown
}

export type Team = {
  id: string
  name: string
  organizationId: string
}

export type Agent = {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  tags: string[] | null
}

export type Chat = {
  id: string
  title: string
  visibility: ConversationVisibility
  createdByUserId?: string | null
  updatedAt?: string
}

export type ConversationVisibility = 'private' | 'shared' | 'team'

export type Message = {
  id: string
  status: AIMessageStatus
  role: AIMessageRole
  parts: AIMessagePart[] | null
  metadata?: AIMessageMetadata | null
  authorId?: string | null
}

export type MessageNode = Message & {
  parentId?: string | null
  children?: string[]
}

export type PromptInputStatus = 'submitted' | 'streaming' | 'ready' | 'error'

export type PromptMessagePart =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'file'
      mediaType: string
      filename?: string
      url: string
    }
