import type { EmbeddingModel } from '@workspace/ai'
import type { SourceType } from '@workspace/core/sources'
import { generateEmbeddings } from '../lib/embeddings'
import type { Collection, SourcesDocument } from '../lib/types'
import { index } from '../upstash-vector'
import type {
  DatabaseSourceProperNounsDocument,
  DatabaseSourceQueryExamplesDocument,
  DatabaseSourceTablesMetadataDocument,
} from './upsert'

type QueryParams<T> = {
  embeddingModel: EmbeddingModel
  namespace: string
  collection: T
  agentId?: string
  sourceId?: string
  sourceIds?: string[]
  sourceType?: SourceType
  query: string
  filter?: string
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

type QueryResult = {
  sources: SourcesCollectionQueryResult
  'database-source-tables-metadata': DatabaseSourceTablesMetadataCollectionQueryResult
  'database-source-proper-nouns': DatabaseSourceProperNounsCollectionQueryResult
  'database-source-query-examples': DatabaseSourceQueryExamplesCollectionQueryResult
}

export async function query<T extends Collection>(params: QueryParams<T>) {
  let filter = `__meta.collection = '${params.collection}'`

  if (params.agentId) {
    filter += ` AND __meta.agentId = '${params.agentId}'`
  }

  if (params.sourceId) {
    filter += ` AND __meta.sourceId = '${params.sourceId}'`
  }

  if (params.sourceIds) {
    filter += ` AND __meta.sourceId IN (${params.sourceIds.map((id) => `'${id}'`).join(', ')})`
  }

  if (params.sourceType) {
    filter += ` AND __meta.sourceType = '${params.sourceType}'`
  }

  if (params.filter) {
    filter += ` AND (${params.filter})`
  }

  const [vector] = await generateEmbeddings({
    embeddingModel: params.embeddingModel,
    value: params.query,
  })

  const documents = await index.namespace(params.namespace).query({
    vector: vector || [],
    filter,
    topK: params.topK || 5,
    includeMetadata: true,
    includeData: true,
  })

  const result = documents.map((doc) => {
    const { __meta, ...metadata } = doc.metadata as any

    return {
      id: doc.id,
      collection: __meta.collection,
      agentId: __meta.agentId,
      sourceId: __meta.sourceId,
      sourceType: __meta.sourceType,
      data: {
        content: doc.data,
        metadata,
      },
    }
  })

  return result as any as QueryResult[T][]
}
