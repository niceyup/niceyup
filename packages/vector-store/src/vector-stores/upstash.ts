import { UpstashVectorStore as UpstashVectorStoreLangchain } from '@langchain/community/vectorstores/upstash'
import type { DocumentInterface } from '@langchain/core/documents'
import { SyntheticEmbeddings } from '@langchain/core/utils/testing'
import { Index } from '@upstash/vector'
import { generateEmbeddings } from '../lib/embeddings'
import type { Collection } from '../lib/types'
import { deterministicUuid } from '../lib/utils'
import {
  type DeleteParams,
  type QueryParams,
  type QueryResult,
  type UpsertParams,
  VectorStore,
  type VectorStoreConfig,
  type VectorStoreOptions,
} from '../lib/vector-store'

type FilterType = UpstashVectorStoreLangchain['FilterType']

export class UpstashVectorStore extends VectorStore {
  private readonly vectorStore: UpstashVectorStoreLangchain

  constructor(config: VectorStoreConfig, options: VectorStoreOptions) {
    super(config, options)

    const index = new Index({
      url: config.settings.url,
      token: config.credentials.token,
    })

    this.vectorStore = new UpstashVectorStoreLangchain(
      new SyntheticEmbeddings(),
      {
        index,
        namespace: options.namespace,
      },
    )
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

      const document = {
        id: deterministicUuid(
          [
            params.collection,
            params.sourceId,
            params.sourceType,
            doc.content,
          ].join(':'),
        ),
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
      ids.push(document.id)
    }

    await this.vectorStore.addVectors(vectors, documents, { ids })
  }

  async query<COLLECTION extends Collection, FILTER = FilterType>(
    params: QueryParams<COLLECTION, FILTER>,
  ): Promise<QueryResult<COLLECTION>> {
    let filter = `__meta.collection = '${params.collection}'`

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
    const filter = `__meta.sourceId = '${params.sourceId}'`

    await this.vectorStore.index.namespace(this.namespace).delete({ filter })
  }

  async deleteAll(): Promise<void> {
    await this.vectorStore.index.namespace(this.namespace).reset()
  }
}

export function createUpstashVectorStore(
  config: VectorStoreConfig,
  options: VectorStoreOptions,
) {
  return new UpstashVectorStore(config, options)
}
