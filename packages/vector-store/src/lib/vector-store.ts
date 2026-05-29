import type { EmbeddingModel } from '@workspace/ai'
import type {
  DatabaseSourceTableMetadata,
  SourceType,
} from '@workspace/core/sources'
import type { VectorStoreSchemas } from '@workspace/core/vector-stores'
import type {
  Collection,
  SingleOrMultiple,
  SourcesDocument,
} from '../lib/types'

export type VectorStoreConfig = VectorStoreSchemas

export type VectorStoreProviderConfig<P extends VectorStoreConfig['provider']> =
  Extract<VectorStoreConfig, { provider: P }>

export type VectorStoreOptions = {
  namespace: string
  embeddingModel: EmbeddingModel
}

export abstract class VectorStore {
  config: VectorStoreConfig

  namespace: string

  embeddingModel: EmbeddingModel

  constructor(config: VectorStoreConfig, options: VectorStoreOptions) {
    this.config = config
    this.namespace = options.namespace
    this.embeddingModel = options.embeddingModel
  }

  abstract upsert(params: UpsertParams): Promise<void>

  abstract query<COLLECTION extends Collection>(
    params: QueryParams<COLLECTION>,
  ): Promise<QueryResult<COLLECTION>>

  abstract delete(params: DeleteParams): Promise<void>

  abstract deleteAll(): Promise<void>
}

// ================================
// Upsert Types
// ================================

type DatabaseSourceTablesMetadataDocument = {
  content: string
  metadata: {
    tableMetadata: DatabaseSourceTableMetadata
  }
}

type DatabaseSourceProperNounsDocument = {
  content: string
  metadata: {
    key: string
  }
}

type DatabaseSourceQueryExamplesDocument = {
  content: string
  metadata?: never
}

type SourcesCollectionUpsertParams = {
  collection: 'sources'
  sourceId: string
  sourceType: SourceType
  data: SingleOrMultiple<SourcesDocument>
}

type DatabaseSourceTablesMetadataCollectionUpsertParams = {
  collection: 'database-source-tables-metadata'
  sourceId: string
  sourceType: 'database'
  data: SingleOrMultiple<DatabaseSourceTablesMetadataDocument>
}

type DatabaseSourceProperNounsCollectionUpsertParams = {
  collection: 'database-source-proper-nouns'
  sourceId: string
  sourceType: 'database'
  data: SingleOrMultiple<DatabaseSourceProperNounsDocument>
}

type DatabaseSourceQueryExamplesCollectionUpsertParams = {
  collection: 'database-source-query-examples'
  sourceId: string
  sourceType: 'database'
  data: SingleOrMultiple<DatabaseSourceQueryExamplesDocument>
}

export type UpsertParams =
  | SourcesCollectionUpsertParams
  | DatabaseSourceTablesMetadataCollectionUpsertParams
  | DatabaseSourceProperNounsCollectionUpsertParams
  | DatabaseSourceQueryExamplesCollectionUpsertParams

// ================================
// Query Types
// ================================

type QueryFilterParams = {
  key?: string
}

export type QueryParams<COLLECTION extends Collection> = {
  collection: COLLECTION
  sourceId?: string
  sourceIds?: string[]
  sourceType?: SourceType
  query: string
  filter?: QueryFilterParams
  topK?: number
}

type SourcesCollectionQueryResult = {
  collection: 'sources'
  sourceId: string
  sourceType: SourceType
  data: SourcesDocument
}

type DatabaseSourceTablesMetadataCollectionQueryResult = {
  collection: 'database-source-tables-metadata'
  sourceId: string
  sourceType: 'database'
  data: DatabaseSourceTablesMetadataDocument
}

type DatabaseSourceProperNounsCollectionQueryResult = {
  collection: 'database-source-proper-nouns'
  sourceId: string
  sourceType: 'database'
  data: DatabaseSourceProperNounsDocument
}

type DatabaseSourceQueryExamplesCollectionQueryResult = {
  collection: 'database-source-query-examples'
  sourceId: string
  sourceType: 'database'
  data: DatabaseSourceQueryExamplesDocument
}

type QueryResultMap = {
  sources: SourcesCollectionQueryResult
  'database-source-tables-metadata': DatabaseSourceTablesMetadataCollectionQueryResult
  'database-source-proper-nouns': DatabaseSourceProperNounsCollectionQueryResult
  'database-source-query-examples': DatabaseSourceQueryExamplesCollectionQueryResult
}

export type QueryResult<COLLECTION extends Collection> =
  QueryResultMap[COLLECTION][]

// ================================
// Delete Types
// ================================

export type DeleteParams = {
  sourceId: string
}
