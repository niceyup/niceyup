import type {
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
  AIMessageStatus,
} from '@workspace/ai/types'
import type {
  ConnectionApp,
  ConnectionCredentials,
  ConnectionTokens,
} from '@workspace/core/connections'
import type { ConversationVisibility } from '@workspace/core/conversations'
import type { ModelSettingsOptions, ModelType } from '@workspace/core/models'
import type { Provider, ProviderCredentials } from '@workspace/core/providers'
import type {
  DatabaseSourceDialect,
  DatabaseSourceQueryExample,
  DatabaseSourceTableMetadata,
  SourceIndexStatus,
  SourceOperationStatus,
  SourceOperationType,
  SourceStatus,
  SourceType,
} from '@workspace/core/sources'
import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import type {
  FileBucket,
  FileMetadata,
  FileScope,
  OperationError,
  PromptMessage,
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

export const modelSettings = pgTable('model_settings', {
  ...id,
  provider: text('provider').notNull().$type<Provider>(),
  model: text('model').notNull(),
  type: text('type').notNull().default('language-model').$type<ModelType>(),
  options: jsonb('options').$type<ModelSettingsOptions>(),

  ...timestamps,
})

export const modelSettingsRelations = relations(modelSettings, ({ many }) => ({
  agentLanguageModelSettings: many(agents, {
    relationName: 'language_model_settings',
  }),
  agentEmbeddingModelSettings: many(agents, {
    relationName: 'embedding_model_settings',
  }),
  conversationLanguageModelSettings: many(conversations, {
    relationName: 'language_model_settings',
  }),
}))

export const agents = pgTable(
  'agents',
  {
    ...id,
    name: text('name').notNull().default('Unnamed'),
    slug: text('slug').notNull(),
    logo: text('logo'),
    description: text('description'),
    tags: text('tags').array(),
    published: boolean('published').notNull().default(false),

    // agent configuration
    languageModelSettingsId: text('language_model_settings_id').references(
      () => modelSettings.id,
      {
        onDelete: 'set null',
      },
    ),
    embeddingModelSettingsId: text('embedding_model_settings_id').references(
      () => modelSettings.id,
      {
        onDelete: 'set null',
      },
    ),
    // vectorStoreId: text('vector_store_id').references(() => vectorStores.id, {
    //   onDelete: 'set null',
    // }),

    systemMessage: text('system_message'),
    promptMessages: jsonb('prompt_messages').$type<PromptMessage[]>(),
    suggestions: jsonb('suggestions').$type<string[]>(),

    enableSourceRetrievalTool: boolean('enable_source_retrieval_tool').default(
      false,
    ), // temporary flag to enable or disable the source retrieval tool

    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),

    ...timestamps,
  },
  (table) => [unique().on(table.organizationId, table.slug)],
)

export const agentsRelations = relations(agents, ({ one, many }) => ({
  languageModelSettings: one(modelSettings, {
    relationName: 'language_model_settings',
    fields: [agents.languageModelSettingsId],
    references: [modelSettings.id],
  }),
  embeddingModelSettings: one(modelSettings, {
    relationName: 'embedding_model_settings',
    fields: [agents.embeddingModelSettingsId],
    references: [modelSettings.id],
  }),
  // vectorStore: one(vectorStores, {
  //   fields: [agents.vectorStoreId],
  //   references: [vectorStores.id],
  // }),
  conversations: many(conversations),
  sourceIndexes: many(sourceIndexes),
}))

export const conversations = pgTable('conversations', {
  ...id,
  title: text('title').notNull().default('Untitled'),

  // conversation configuration
  languageModelSettingsId: text('language_model_settings_id').references(
    () => modelSettings.id,
    {
      onDelete: 'set null',
    },
  ),

  systemMessage: text('system_message'),
  promptMessages: jsonb('prompt_messages').$type<PromptMessage[]>(),

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
    languageModelSettings: one(modelSettings, {
      relationName: 'language_model_settings',
      fields: [conversations.languageModelSettingsId],
      references: [modelSettings.id],
    }),
    agent: one(agents, {
      fields: [conversations.agentId],
      references: [agents.id],
    }),
    messages: many(messages),
    participants: many(participants),
  }),
)

export const messages = pgTable('messages', {
  ...id,
  status: text('status').notNull().default('queued').$type<AIMessageStatus>(),
  role: text('role').notNull().default('user').$type<AIMessageRole>(),
  parts: jsonb('parts').$type<AIMessagePart[]>(),
  metadata: jsonb('metadata').$type<AIMessageMetadata>(),

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

export const participants = pgTable(
  'participants',
  {
    ...id,

    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    ...timestamps,
  },
  (table) => [unique().on(table.conversationId, table.userId)],
)

export const participantsRelations = relations(participants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [participants.conversationId],
    references: [conversations.id],
  }),
}))

export const providers = pgTable('providers', {
  ...id,
  provider: text('provider').notNull().$type<Provider>(),
  credentials: encryptedJson('credentials').$type<ProviderCredentials>(),

  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  ...timestamps,
})

export const sources = pgTable('sources', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  type: text('type').notNull().$type<SourceType>(),
  status: text('status').notNull().default('draft').$type<SourceStatus>(),

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
  sourceIndexes: many(sourceIndexes),
  sourceOperations: many(sourceOperations),
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

export const sourceIndexes = pgTable(
  'source_indexes',
  {
    ...id,
    status: text('status').notNull().default('idle').$type<SourceIndexStatus>(),

    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, {
        onDelete: 'cascade',
      }),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, {
        onDelete: 'cascade',
      }),

    ...timestamps,
  },
  (table) => [unique().on(table.agentId, table.sourceId)],
)

export const sourceIndexesRelations = relations(
  sourceIndexes,
  ({ one, many }) => ({
    agent: one(agents, {
      fields: [sourceIndexes.agentId],
      references: [agents.id],
    }),
    source: one(sources, {
      fields: [sourceIndexes.sourceId],
      references: [sources.id],
    }),
    sourceOperations: many(sourceOperations),
  }),
)

export const sourceOperations = pgTable('source_operations', {
  ...id,
  type: text('type').notNull().$type<SourceOperationType>(),
  status: text('status')
    .notNull()
    .default('queued')
    .$type<SourceOperationStatus>(),

  sourceId: text('source_id')
    .unique()
    .references(() => sources.id, {
      onDelete: 'cascade',
    }),
  sourceIndexId: text('source_index_id')
    .unique()
    .references(() => sourceIndexes.id, {
      onDelete: 'cascade',
    }),

  error: jsonb('error').$type<OperationError>(),
  attempts: integer('attempts').notNull().default(0),
  ...timestamps,
})

export const sourceOperationsRelations = relations(
  sourceOperations,
  ({ one }) => ({
    source: one(sources, {
      fields: [sourceOperations.sourceId],
      references: [sources.id],
    }),
    sourceIndex: one(sourceIndexes, {
      fields: [sourceOperations.sourceIndexId],
      references: [sourceIndexes.id],
    }),
  }),
)

export const connections = pgTable('connections', {
  ...id,
  app: text('app').notNull().$type<ConnectionApp>(),
  name: text('name').notNull().default('Unnamed'),
  // authorization: text('authorization')
  //   .notNull()
  //   .default('custom')
  //   .$type<ConnectionAuthorization>(),
  credentials: encryptedJson('credentials').$type<ConnectionCredentials>(),
  tokens: encryptedJson('tokens').$type<ConnectionTokens>(),

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
