import type { EmbeddingModel } from '@workspace/ai'
import type {
  DatabaseSourceTableMetadata,
  SourceType,
} from '@workspace/core/sources'
import { generateEmbeddings } from '../lib/embeddings'
import type { SingleOrMultiple, SourcesDocument } from '../lib/types'
import { deterministicUuid } from '../lib/utils'
import { index } from '../upstash-vector'

export type DatabaseSourceTablesMetadataDocument = {
  content: string
  metadata: {
    tableMetadata: DatabaseSourceTableMetadata
  }
}

export type DatabaseSourceProperNounsDocument = {
  content: string
  metadata: {
    key: string
  }
}

export type DatabaseSourceQueryExamplesDocument = {
  content: string
  metadata?: never
}

type SourcesCollectionUpsertParams = {
  collection: 'sources'
  agentId: string
  sourceId: string
  sourceType: SourceType
  data: SingleOrMultiple<SourcesDocument>
}

type DatabaseSourceTablesMetadataCollectionUpsertParams = {
  collection: 'database-source-tables-metadata'
  agentId: string
  sourceId: string
  sourceType: 'database'
  data: SingleOrMultiple<DatabaseSourceTablesMetadataDocument>
}

type DatabaseSourceProperNounsCollectionUpsertParams = {
  collection: 'database-source-proper-nouns'
  agentId: string
  sourceId: string
  sourceType: 'database'
  data: SingleOrMultiple<DatabaseSourceProperNounsDocument>
}

type DatabaseSourceQueryExamplesCollectionUpsertParams = {
  collection: 'database-source-query-examples'
  agentId: string
  sourceId: string
  sourceType: 'database'
  data: SingleOrMultiple<DatabaseSourceQueryExamplesDocument>
}

type UpsertParams = {
  embeddingModel: EmbeddingModel
  namespace: string
} & (
  | SourcesCollectionUpsertParams
  | DatabaseSourceTablesMetadataCollectionUpsertParams
  | DatabaseSourceProperNounsCollectionUpsertParams
  | DatabaseSourceQueryExamplesCollectionUpsertParams
)

export async function upsert(params: UpsertParams) {
  const data = Array.isArray(params.data) ? params.data : [params.data]

  const embeddings = await generateEmbeddings({
    embeddingModel: params.embeddingModel,
    value: data.map((d) => d.content),
  })

  const documents = data.map((d, index) => ({
    id: deterministicUuid(
      [
        params.collection,
        params.agentId,
        params.sourceId,
        params.sourceType,
        d.content,
      ].join(':'),
    ),
    vector: embeddings[index],
    data: d.content,
    metadata: {
      __meta: {
        collection: params.collection,
        agentId: params.agentId,
        sourceId: params.sourceId,
        sourceType: params.sourceType,
      },
      ...d.metadata,
    },
  }))

  if (!documents.length) {
    return 'No documents to upsert'
  }

  const result = await index.namespace(params.namespace).upsert(documents)

  return result
}
