import type { EmbeddingModel } from '@workspace/ai'
import { vectorStoreSchemas } from '@workspace/core/vector-stores'
import { queries } from '@workspace/db/queries'
import { createVectorStoreRegistry } from '@workspace/vector-store'
import { InvalidArgumentError } from '../erros'

export type VectorStore = Awaited<ReturnType<typeof resolveVectorStore>>

export async function resolveVectorStore(params: {
  vectorStoreId: string | null | undefined
}) {
  const vectorStore = params.vectorStoreId
    ? await queries.getVectorStore({
        vectorStoreId: params.vectorStoreId,
      })
    : null

  if (!vectorStore) {
    throw new InvalidArgumentError({
      code: 'VECTOR_STORE_NOT_SET',
      message: 'Vector store is not set',
    })
  }

  const vectorStoreConfig = vectorStoreSchemas.safeParse(vectorStore)

  if (!vectorStoreConfig.success) {
    throw new InvalidArgumentError({
      code: 'VECTOR_STORE_INVALID',
      message: 'Vector store is invalid',
    })
  }

  const createVectorStore = (params: {
    namespace: string
    embeddingModel: EmbeddingModel
  }) => {
    return createVectorStoreRegistry(vectorStoreConfig.data, params)
  }

  return createVectorStore
}
