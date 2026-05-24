import type {
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
  AIMessageStatus,
} from '@workspace/ai/types'
import type {
  ConnectionApp,
  ConnectionAuthentication,
  ConnectionCredentials,
  ConnectionSettings,
  ConnectionTokens,
} from '@workspace/core/connections'
import type {
  ConversationExplorerNodeType,
  ConversationVisibility,
} from '@workspace/core/conversations'
import type { FileBucket, FileMetadata, FileScope } from '@workspace/core/files'
import type { KnowledgeBaseStatus } from '@workspace/core/knowledge-bases'
import type { McpServerType } from '@workspace/core/mcp-servers'
import type {
  ModelProvider,
  ModelProviderCredentials,
  ModelProviderSettings,
} from '@workspace/core/model-providers'
import type { ModelSettingsOptions, ModelType } from '@workspace/core/models'
import type {
  DatabaseSourceDialect,
  DatabaseSourceQueryExample,
  DatabaseSourceTableMetadata,
  IndexedSourceStatus,
  SourceExplorerNodeFlag,
  SourceExplorerNodeType,
  SourceOperationStatus,
  SourceOperationType,
  SourceStatus,
  SourceType,
} from '@workspace/core/sources'
import type {
  VectorStoreCredentials,
  VectorStoreProvider,
  VectorStoreSettings,
} from '@workspace/core/vector-stores'
import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import type {
  ActiveToolArguments,
  ActiveToolType,
  McpServerCredentials,
  McpServerHeaders,
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

export const modelProviders = pgTable('model_providers', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  provider: text('provider').notNull().$type<ModelProvider>(),
  settings: jsonb('settings').$type<ModelProviderSettings>(),
  credentials: encryptedJson('credentials').$type<ModelProviderCredentials>(),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const modelProvidersRelations = relations(
  modelProviders,
  ({ many }) => ({
    modelSettings: many(modelSettings),
  }),
)

export const vectorStores = pgTable('vector_stores', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  provider: text('provider').notNull().$type<VectorStoreProvider>(),
  settings: jsonb('settings').$type<VectorStoreSettings>(),
  credentials: encryptedJson('credentials').$type<VectorStoreCredentials>(),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const vectorStoresRelations = relations(vectorStores, ({ many }) => ({
  knowledgeBases: many(knowledgeBases),
}))

export const connections = pgTable('connections', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  app: text('app').notNull().$type<ConnectionApp>(),
  authentication: text('authentication')
    .notNull()
    .default('custom')
    .$type<ConnectionAuthentication>(),
  settings: jsonb('settings').$type<ConnectionSettings>(),
  credentials: encryptedJson('credentials').$type<ConnectionCredentials>(),
  tokens: encryptedJson('tokens').$type<ConnectionTokens>(),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const connectionsRelations = relations(connections, ({ many }) => ({
  mcpServers: many(mcpServers),
  databaseSources: many(databaseSources),
}))

export const mcpServers = pgTable('mcp_servers', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  type: text('type').notNull().$type<McpServerType>(),
  url: text('url').notNull(),
  headers: jsonb('headers').$type<McpServerHeaders>(),
  credentials: encryptedJson('credentials').$type<McpServerCredentials>(),

  connectionId: text('connection_id').references(() => connections.id, {
    onDelete: 'set null',
  }),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const mcpServersRelations = relations(mcpServers, ({ one, many }) => ({
  connection: one(connections, {
    fields: [mcpServers.connectionId],
    references: [connections.id],
  }),
  activeTools: many(activeTools),
}))

export const activeTools = pgTable('active_tools', {
  ...id,
  name: text('name'),
  tool: text('tool').notNull(),
  type: text('type').notNull().$type<ActiveToolType>(),
  arguments: jsonb('arguments').$type<ActiveToolArguments>(),

  mcpServerId: text('mcp_server_id').references(() => mcpServers.id, {
    onDelete: 'cascade',
  }),

  agentConfigurationId: text('agent_configuration_id')
    .notNull()
    .references(() => agentConfigurations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const activeToolsRelations = relations(activeTools, ({ one }) => ({
  mcpServer: one(mcpServers, {
    fields: [activeTools.mcpServerId],
    references: [mcpServers.id],
  }),
  agentConfiguration: one(agentConfigurations, {
    fields: [activeTools.agentConfigurationId],
    references: [agentConfigurations.id],
  }),
}))

export const modelSettings = pgTable('model_settings', {
  ...id,
  model: text('model').notNull(),
  type: text('type').notNull().$type<ModelType>(),
  options: jsonb('options').$type<ModelSettingsOptions>(),

  providerId: text('provider_id').references(() => modelProviders.id, {
    onDelete: 'set null',
  }),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const modelSettingsRelations = relations(
  modelSettings,
  ({ one, many }) => ({
    provider: one(modelProviders, {
      fields: [modelSettings.providerId],
      references: [modelProviders.id],
    }),
    auxiliaryLanguageModelSettings: many(agentSystemConfigurations, {
      relationName: 'language_model_settings',
    }),
    languageModelSettings: many(agentConfigurations, {
      relationName: 'language_model_settings',
    }),
    embeddingModelSettings: many(knowledgeBases, {
      relationName: 'embedding_model_settings',
    }),
  }),
)

export const agentSystemConfigurations = pgTable(
  'agent_system_configurations',
  {
    ...id,

    auxiliaryLanguageModelSettingsId: text(
      'auxiliary_language_model_settings_id',
    ).references(() => modelSettings.id, {
      onDelete: 'set null',
    }),
    titleGenerationSystemMessage: text('title_generation_system_message'),
    suggestions: jsonb('suggestions').$type<string[]>(),

    agentId: text('agent_id')
      .notNull()
      .unique()
      .references(() => agents.id, {
        onDelete: 'cascade',
      }),

    ...timestamps,
  },
)

export const agentSystemConfigurationsRelations = relations(
  agentSystemConfigurations,
  ({ one }) => ({
    auxiliaryLanguageModelSettings: one(modelSettings, {
      relationName: 'language_model_settings',
      fields: [agentSystemConfigurations.auxiliaryLanguageModelSettingsId],
      references: [modelSettings.id],
    }),
    agent: one(agents, {
      fields: [agentSystemConfigurations.agentId],
      references: [agents.id],
    }),
  }),
)

export const agentConfigurations = pgTable(
  'agent_configurations',
  {
    ...id,

    languageModelSettingsId: text('language_model_settings_id').references(
      () => modelSettings.id,
      {
        onDelete: 'set null',
      },
    ),
    systemMessage: text('system_message'),
    promptMessages: jsonb('prompt_messages').$type<PromptMessage[]>(),

    enableKnowledgeBaseTool: boolean('enable_knowledge_base_tool').default(
      false,
    ),

    agentId: text('agent_id')
      .unique()
      .references(() => agents.id, {
        onDelete: 'cascade',
      }),
    conversationId: text('conversation_id')
      .unique()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),

    ...timestamps,
  },
  (table) => [
    check(
      'exactly_one_owner',
      sql`(${table.agentId} IS NOT NULL AND ${table.conversationId} IS NULL) OR (${table.agentId} IS NULL AND ${table.conversationId} IS NOT NULL)`,
    ),
  ],
)

export const agentConfigurationsRelations = relations(
  agentConfigurations,
  ({ one, many }) => ({
    languageModelSettings: one(modelSettings, {
      relationName: 'language_model_settings',
      fields: [agentConfigurations.languageModelSettingsId],
      references: [modelSettings.id],
    }),
    agent: one(agents, {
      fields: [agentConfigurations.agentId],
      references: [agents.id],
    }),
    conversation: one(conversations, {
      fields: [agentConfigurations.conversationId],
      references: [conversations.id],
    }),
    activeTools: many(activeTools),
  }),
)

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

    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, {
        onDelete: 'cascade',
      }),

    ...timestamps,
  },
  (table) => [unique().on(table.organizationId, table.slug)],
)

export const agentsRelations = relations(agents, ({ one, many }) => ({
  agentSystemConfiguration: one(agentSystemConfigurations),
  agentConfiguration: one(agentConfigurations),
  knowledgeBase: one(knowledgeBases),
  conversations: many(conversations),
}))

export const conversations = pgTable('conversations', {
  ...id,
  title: text('title').notNull().default('New conversation'),

  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, {
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
    agent: one(agents, {
      fields: [conversations.agentId],
      references: [agents.id],
    }),
    agentConfiguration: one(agentConfigurations),
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

export const knowledgeBases = pgTable('knowledge_bases', {
  ...id,
  status: text('status')
    .notNull()
    .default('ready')
    .$type<KnowledgeBaseStatus>(),

  vectorStoreId: text('vector_store_id').references(() => vectorStores.id, {
    onDelete: 'set null',
  }),
  embeddingModelSettingsId: text('embedding_model_settings_id').references(
    () => modelSettings.id,
    {
      onDelete: 'set null',
    },
  ),
  topK: integer('top_k'),

  agentId: text('agent_id')
    .notNull()
    .unique()
    .references(() => agents.id, {
      onDelete: 'cascade',
    }),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),

  ...timestamps,
})

export const knowledgeBasesRelations = relations(
  knowledgeBases,
  ({ one, many }) => ({
    vectorStore: one(vectorStores, {
      fields: [knowledgeBases.vectorStoreId],
      references: [vectorStores.id],
    }),
    embeddingModelSettings: one(modelSettings, {
      relationName: 'embedding_model_settings',
      fields: [knowledgeBases.embeddingModelSettingsId],
      references: [modelSettings.id],
    }),
    agent: one(agents, {
      fields: [knowledgeBases.agentId],
      references: [agents.id],
    }),
    indexedSources: many(indexedSources),
  }),
)

export const sources = pgTable('sources', {
  ...id,
  name: text('name').notNull().default('Unnamed'),
  type: text('type').notNull().$type<SourceType>(),
  status: text('status').notNull().default('draft').$type<SourceStatus>(),

  // source configuration
  chunkSize: integer('chunk_size'),
  chunkOverlap: integer('chunk_overlap'),

  contentUpdatedAt: timestamp('content_updated_at', { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
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
  indexedSources: many(indexedSources),
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

export const indexedSources = pgTable(
  'indexed_sources',
  {
    ...id,
    status: text('status')
      .notNull()
      .default('idle')
      .$type<IndexedSourceStatus>(),
    indexedAt: timestamp('indexed_at', { withTimezone: true }),

    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBases.id, {
        onDelete: 'cascade',
      }),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, {
        onDelete: 'cascade',
      }),

    ...timestamps,
  },
  (table) => [unique().on(table.knowledgeBaseId, table.sourceId)],
)

export const indexedSourcesRelations = relations(
  indexedSources,
  ({ one, many }) => ({
    knowledgeBase: one(knowledgeBases, {
      fields: [indexedSources.knowledgeBaseId],
      references: [knowledgeBases.id],
    }),
    source: one(sources, {
      fields: [indexedSources.sourceId],
      references: [sources.id],
    }),
    sourceOperations: many(sourceOperations),
  }),
)

export const sourceOperations = pgTable(
  'source_operations',
  {
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
    indexedSourceId: text('indexed_source_id')
      .unique()
      .references(() => indexedSources.id, {
        onDelete: 'cascade',
      }),

    error: jsonb('error').$type<OperationError>(),
    attempts: integer('attempts').notNull().default(1),
    ...timestamps,
  },
  (table) => [
    check(
      'exactly_one_owner',
      sql`(${table.sourceId} IS NOT NULL AND ${table.indexedSourceId} IS NULL) OR (${table.sourceId} IS NULL AND ${table.indexedSourceId} IS NOT NULL)`,
    ),
  ],
)

export const sourceOperationsRelations = relations(
  sourceOperations,
  ({ one }) => ({
    source: one(sources, {
      fields: [sourceOperations.sourceId],
      references: [sources.id],
    }),
    indexedSource: one(indexedSources, {
      fields: [sourceOperations.indexedSourceId],
      references: [indexedSources.id],
    }),
  }),
)

export const files = pgTable('files', {
  ...id,
  fileName: text('file_name').notNull(),
  fileMimeType: text('file_mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  filePath: text('file_path').notNull(),
  bucket: text('bucket').notNull().$type<FileBucket>(),
  scope: text('scope').notNull().$type<FileScope>(),
  metadata: jsonb('metadata').$type<FileMetadata>(),

  referenceId: text('reference_id').notNull(),

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
    type: text('type').$type<ConversationExplorerNodeType>(),
    parentId: text('parent_id'),
    fractionalIndex: text('fractional_index'),

    visibility: text('visibility')
      .notNull()
      .default('private')
      .$type<ConversationVisibility>(),
    sharedByUser: boolean('shared_by_user').notNull().default(false), // True if the owner user shared the private conversation with other users

    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, {
        onDelete: 'cascade',
      }),
    conversationId: text('conversation_id').references(() => conversations.id, {
      onDelete: 'cascade',
    }),

    ownerUserId: text('owner_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    ownerTeamId: text('owner_team_id').references(() => teams.id, {
      onDelete: 'cascade',
    }),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check(
      'exactly_one_owner',
      sql`(${table.ownerUserId} IS NOT NULL AND ${table.ownerTeamId} IS NULL) OR (${table.ownerUserId} IS NULL AND ${table.ownerTeamId} IS NOT NULL)`,
    ),
  ],
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
  type: text('type').$type<SourceExplorerNodeType>(),
  parentId: text('parent_id'),
  fractionalIndex: text('fractional_index'),

  flag: text('flag').$type<SourceExplorerNodeFlag>(),
  readOnly: boolean('read_only').notNull().default(false),

  sourceId: text('source_id').references(() => sources.id, {
    onDelete: 'cascade',
  }),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, {
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
