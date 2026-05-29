import type { DocumentInterface } from '@langchain/core/documents'
import { QdrantVectorStore as QdrantVectorStoreLangchain } from '@langchain/qdrant'
import { generateEmbeddings } from '../lib/embeddings'
import { syntheticEmbeddings } from '../lib/mocks'
import type { Collection } from '../lib/types'
import { deterministicUuid } from '../lib/utils'
import {
  type DeleteParams,
  type QueryParams,
  type QueryResult,
  type UpsertParams,
  VectorStore,
  type VectorStoreOptions,
  type VectorStoreProviderConfig,
} from '../lib/vector-store'

export class QdrantVectorStore extends VectorStore {
  private readonly vectorStore: QdrantVectorStoreLangchain

  constructor(
    config: VectorStoreProviderConfig<'qdrant'>,
    options: VectorStoreOptions,
  ) {
    super(config, options)

    this.vectorStore = new QdrantVectorStoreLangchain(syntheticEmbeddings, {
      url: config.settings.url,
      apiKey: config.credentials.apiKey,
      collectionName: options.namespace,
    })
  }

  async upsert(params: UpsertParams): Promise<void> {
    const data = Array.isArray(params.data) ? params.data : [params.data]

    const embeddings = await generateEmbeddings({
      embeddingModel: this.embeddingModel,
      value: data.map((d) => d.content),
    })

    const vectors: number[][] = []
    const documents: DocumentInterface[] = []
    const ids: string[] = []

    for (const [index, doc] of data.entries()) {
      const vector = embeddings[index]

      const id = deterministicUuid(
        [
          params.collection,
          params.sourceId,
          params.sourceType,
          doc.content,
        ].join(':'),
      )

      const document = {
        id,
        pageContent: doc.content,
        metadata: {
          __meta: {
            collection: params.collection,
            sourceId: params.sourceId,
            sourceType: params.sourceType,
          },
          ...doc.metadata,
        },
      }

      vectors.push(vector ?? [])
      documents.push(document)
      ids.push(id)
    }

    await this.vectorStore.addVectors(vectors, documents, { ids })
  }

  async query<COLLECTION extends Collection>(
    params: QueryParams<COLLECTION>,
  ): Promise<QueryResult<COLLECTION>> {
    const filter: { must: object[] } = {
      must: [
        {
          key: '__meta.collection',
          match: { value: params.collection },
        },
      ],
    }

    if (params.sourceId) {
      filter.must.push({
        key: '__meta.sourceId',
        match: { value: params.sourceId },
      })
    }

    if (params.sourceIds) {
      filter.must.push({
        key: '__meta.sourceId',
        match: { any: params.sourceIds },
      })
    }

    if (params.sourceType) {
      filter.must.push({
        key: '__meta.sourceType',
        match: { value: params.sourceType },
      })
    }

    if (params.filter?.key) {
      filter.must.push({
        key: 'key',
        match: { value: params.filter.key },
      })
    }

    const [vector] = await generateEmbeddings({
      embeddingModel: this.embeddingModel,
      value: params.query,
    })

    const documents = await this.vectorStore.similaritySearchVectorWithScore(
      vector ?? [],
      params.topK || 5,
      filter,
    )

    const result = documents.map(([doc]) => {
      const { __meta, ...metadata } = doc.metadata

      return {
        id: doc.id,
        collection: __meta.collection,
        sourceId: __meta.sourceId,
        sourceType: __meta.sourceType,
        data: {
          content: doc.pageContent,
          metadata,
        },
      }
    })

    return result as unknown as QueryResult<COLLECTION>
  }

  async delete(params: DeleteParams): Promise<void> {
    const filter = {
      must: [
        {
          key: '__meta.sourceId',
          match: { value: params.sourceId },
        },
      ],
    }

    await this.vectorStore.delete({ filter })
  }

  async deleteAll(): Promise<void> {
    await this.vectorStore.client.deleteCollection(this.namespace)
  }
}

export function createQdrantVectorStore(
  config: VectorStoreProviderConfig<'qdrant'>,
  options: VectorStoreOptions,
) {
  return new QdrantVectorStore(config, options)
}
