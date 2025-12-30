import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import type {
  ConnectionApp,
  ConnectionPayload,
  ConversationVisibility,
  DatabaseSourceDialect,
  DatabaseSourceQueryExample,
  DatabaseSourceTableMetadata,
  FileBucket,
  FileMetadata,
  FileScope,
  MessageMetadata,
  MessagePart,
  MessageRole,
  MessageStatus,
  ModelOptions,
  ModelType,
  PromptMessage,
  ProviderApp,
  ProviderPayload,
  SourceType,
} from '../lib/types'
import { encryptedJson, id, timestamps } from '../utils'
import { organizations, teams, users } from './auth'

export * from './auth'

export const flags = pgTable('flags', {
  ...id,
  slug: text('slug').notNull().unique(),
})

export const flagsRelations = relations(flags, ({ many }) => ({
  organizations: many(flagsToOrganizations),
}))

export const flagsToOrganizations = pgTable(
  'flags_to_organizations',
  {
    flagId: text('flag_id')
      .notNull()
      .references(() => flags.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
  },
  (t) => [primaryKey({ columns: [t.flagId, t.organizationId] })],
)

export const flagsToOrganizationsRelations = relations(
  flagsToOrganizations,
  ({ one }) => ({
    flag: one(flags, {
      fields: [flagsToOrganizations.flagId],
      references: [flags.id],
    }),
    organization: one(organizations, {
      fields: [flagsToOrganizations.organizationId],
      references: [organizations.id],
    }),
  }),
)

export const models = pgTable('models', {
  ...id,
  type: text('type').notNull().default('language_model').$type<ModelType>(),
  model: text('model').notNull(),
  options: jsonb('options').$type<ModelOptions>(),

  providerId: text('provider_id').references(() => providers.id, {
    onDelete: 'set null',
  }),

  ...timestamps,
})

export const agents = pgTable('agents', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  description: text('description'),
  tags: text('tags').array(),
  published: boolean('published').notNull().default(false),

  // agent configuration
  languageModelId: text('language_model_id').references(() => models.id, {
    onDelete: 'set null',
  }),
  embeddingModelId: text('embedding_model_id').references(() => models.id, {
    onDelete: 'set null',
  }),

  systemMessage: text('system_message'),
  promptMessages: jsonb('prompt_messages').$type<PromptMessage[]>(),
  suggestions: jsonb('suggestions').$type<string[]>(),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  ...timestamps,
})

export const agentsRelations = relations(agents, ({ one, many }) => ({
  languageModel: one(models, {
    fields: [agents.languageModelId],
    references: [models.id],
  }),
  embeddingModel: one(models, {
    fields: [agents.embeddingModelId],
    references: [models.id],
  }),
  conversations: many(conversations),
}))

export const conversations = pgTable('conversations', {
  ...id,
  title: text('title').notNull().default('Untitled'),

  // conversation configuration
  languageModelId: text('language_model_id').references(() => models.id, {
    onDelete: 'set null',
  }),

  agentId: text('agent_id').references(() => agents.id, {
    onDelete: 'cascade',
  }),
  teamId: text('team_id').references(() => teams.id, {
    onDelete: 'cascade',
  }),
  createdByUserId: text('created_by_user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
})

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    languageModel: one(models, {
      fields: [conversations.languageModelId],
      references: [models.id],
    }),
    agent: one(agents, {
      fields: [conversations.agentId],
      references: [agents.id],
    }),
    messages: many(messages),
    participants: many(conversationsToUsers),
  }),
)

export const messages = pgTable('messages', {
  ...id,
  status: text('status').notNull().default('queued').$type<MessageStatus>(),
  role: text('role').notNull().default('user').$type<MessageRole>(),
  parts: jsonb('parts').$type<MessagePart[]>(),
  metadata: jsonb('metadata').$type<MessageMetadata>(),

  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, {
      onDelete: 'cascade',
    }),
  authorId: text('author_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  parentId: text('parent_id'),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
})

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  author: one(users, {
    fields: [messages.authorId],
    references: [users.id],
  }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id],
    relationName: 'parent',
  }),
  children: many(messages, {
    relationName: 'parent',
  }),
}))

export const agentsToSources = pgTable(
  'agents_to_sources',
  {
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
  },
  (t) => [primaryKey({ columns: [t.agentId, t.sourceId] })],
)

export const agentsToSourcesRelations = relations(
  agentsToSources,
  ({ one }) => ({
    agent: one(agents, {
      fields: [agentsToSources.agentId],
      references: [agents.id],
    }),
    source: one(sources, {
      fields: [agentsToSources.sourceId],
      references: [sources.id],
    }),
  }),
)

export const conversationsToUsers = pgTable(
  'conversations_to_users',
  {
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
)

export const conversationsToUsersRelations = relations(
  conversationsToUsers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationsToUsers.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationsToUsers.userId],
      references: [users.id],
    }),
  }),
)

export const providers = pgTable('providers', {
  ...id,
  app: text('app').notNull().$type<ProviderApp>(),
  name: text('name').notNull().default('Unnamed'),
  payload: encryptedJson('payload').$type<ProviderPayload>(),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  ...timestamps,
})

export const sources = pgTable('sources', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  type: text('type').notNull().$type<SourceType>(),

  // source configuration
  chunkSize: integer('chunk_size'),
  chunkOverlap: integer('chunk_overlap'),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
})

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  textSource: one(textSources),
  questionAnswerSource: one(questionAnswerSources),
  websiteSource: one(websiteSources),
  fileSource: one(fileSources),
  databaseSource: one(databaseSources),
  agents: many(agentsToSources),
}))

export const textSources = pgTable('text_sources', {
  ...id,
  text: text('text').notNull(),

  sourceId: text('source_id')
    .notNull()
    .unique()
    .references(() => sources.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const textSourcesRelations = relations(textSources, ({ one }) => ({
  source: one(sources, {
    fields: [textSources.sourceId],
    references: [sources.id],
  }),
}))

export const questionAnswerSources = pgTable('question_answer_sources', {
  ...id,
  questions: jsonb('questions').notNull().$type<string[]>(),
  answer: text('answer').notNull(),

  sourceId: text('source_id')
    .notNull()
    .unique()
    .references(() => sources.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const questionAnswerSourcesRelations = relations(
  questionAnswerSources,
  ({ one }) => ({
    source: one(sources, {
      fields: [questionAnswerSources.sourceId],
      references: [sources.id],
    }),
  }),
)

export const websiteSources = pgTable('website_sources', {
  ...id,
  url: text('url').notNull(),
  // TODO: implement settings

  sourceId: text('source_id')
    .notNull()
    .unique()
    .references(() => sources.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const websiteSourcesRelations = relations(websiteSources, ({ one }) => ({
  source: one(sources, {
    fields: [websiteSources.sourceId],
    references: [sources.id],
  }),
}))

export const fileSources = pgTable('file_sources', {
  ...id,

  sourceId: text('source_id')
    .notNull()
    .unique()
    .references(() => sources.id, {
      onDelete: 'cascade',
    }),
  fileId: text('file_id').references(() => files.id, {
    onDelete: 'cascade',
  }),

  ...timestamps,
})

export const fileSourcesRelations = relations(fileSources, ({ one }) => ({
  source: one(sources, {
    fields: [fileSources.sourceId],
    references: [sources.id],
  }),
  file: one(files, {
    fields: [fileSources.fileId],
    references: [files.id],
  }),
}))

export const databaseSources = pgTable('database_sources', {
  ...id,
  dialect: text('dialect').notNull().$type<DatabaseSourceDialect>(),
  tablesMetadata:
    jsonb('tables_metadata').$type<DatabaseSourceTableMetadata[]>(),
  queryExamples: jsonb('query_examples').$type<DatabaseSourceQueryExample[]>(),

  sourceId: text('source_id')
    .notNull()
    .unique()
    .references(() => sources.id, {
      onDelete: 'cascade',
    }),
  fileId: text('file_id').references(() => files.id, {
    onDelete: 'cascade',
  }),
  connectionId: text('connection_id').references(() => connections.id, {
    onDelete: 'set null',
  }),

  ...timestamps,
})

export const databaseSourcesRelations = relations(
  databaseSources,
  ({ one }) => ({
    source: one(sources, {
      fields: [databaseSources.sourceId],
      references: [sources.id],
    }),
    file: one(files, {
      fields: [databaseSources.fileId],
      references: [files.id],
    }),
    connection: one(connections, {
      fields: [databaseSources.connectionId],
      references: [connections.id],
    }),
  }),
)

export const connections = pgTable('connections', {
  ...id,
  app: text('app').notNull().$type<ConnectionApp>(),
  name: text('name').notNull().default('Unnamed'),
  payload: encryptedJson('payload').$type<ConnectionPayload>(),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  ...timestamps,
})

export const connectionsRelations = relations(connections, ({ many }) => ({
  databaseSources: many(databaseSources),
}))

export const files = pgTable('files', {
  ...id,
  fileName: text('file_name').notNull(),
  fileMimeType: text('file_mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path').notNull(),
  bucket: text('bucket').notNull().$type<FileBucket>(),
  scope: text('scope').notNull().$type<FileScope>(),
  metadata: jsonb('metadata').$type<FileMetadata>(),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  ...timestamps,
})

export const filesRelations = relations(files, ({ many }) => ({
  fileSources: many(fileSources),
  databaseSources: many(databaseSources),
}))

export const conversationExplorerNodes = pgTable(
  'conversation_explorer_nodes',
  {
    ...id,
    name: text('name'),
    visibility: text('visibility')
      .notNull()
      .default('private')
      .$type<ConversationVisibility>(),
    sharedByUser: boolean('shared_by_user').notNull().default(false), // True if the owner user shared the private conversation with other users

    agentId: text('agent_id').references(() => agents.id, {
      onDelete: 'cascade',
    }),
    conversationId: text('conversation_id').references(() => conversations.id, {
      onDelete: 'cascade',
    }),
    parentId: text('parent_id'),
    fractionalIndex: text('fractional_index'),

    ownerUserId: text('owner_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    ownerTeamId: text('owner_team_id').references(() => teams.id, {
      onDelete: 'cascade',
    }),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
)

export const conversationExplorerNodesRelations = relations(
  conversationExplorerNodes,
  ({ one, many }) => ({
    agent: one(agents, {
      fields: [conversationExplorerNodes.agentId],
      references: [agents.id],
    }),
    conversation: one(conversations, {
      fields: [conversationExplorerNodes.conversationId],
      references: [conversations.id],
    }),
    parent: one(conversationExplorerNodes, {
      fields: [conversationExplorerNodes.parentId],
      references: [conversationExplorerNodes.id],
      relationName: 'parent',
    }),
    children: many(conversationExplorerNodes, {
      relationName: 'parent',
    }),
  }),
)

export const sourceExplorerNodes = pgTable('source_explorer_nodes', {
  ...id,
  name: text('name'),
  sourceType: text('source_type'),

  sourceId: text('source_id').references(() => sources.id, {
    onDelete: 'cascade',
  }),
  parentId: text('parent_id'),
  fractionalIndex: text('fractional_index'),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
})

export const sourceExplorerNodesRelations = relations(
  sourceExplorerNodes,
  ({ one, many }) => ({
    source: one(sources, {
      fields: [sourceExplorerNodes.sourceId],
      references: [sources.id],
    }),
    parent: one(sourceExplorerNodes, {
      fields: [sourceExplorerNodes.parentId],
      references: [sourceExplorerNodes.id],
      relationName: 'parent',
    }),
    children: many(sourceExplorerNodes, {
      relationName: 'parent',
    }),
  }),
)
