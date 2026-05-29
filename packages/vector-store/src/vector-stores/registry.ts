import { InvalidArgumentError } from '@workspace/core/errros'
import type { VectorStoreProvider } from '@workspace/core/vector-stores'
import type {
  VectorStore,
  VectorStoreConfig,
  VectorStoreOptions,
  VectorStoreProviderConfig,
} from '../lib/vector-store'
import { createQdrantVectorStore } from './qdrant'
import { createUpstashVectorStore } from './upstash'

type Registry = {
  [Provider in VectorStoreProvider]: (
    config: VectorStoreProviderConfig<Provider>,
    options: VectorStoreOptions,
  ) => VectorStore
}

export function createVectorStoreRegistry(
  config: VectorStoreConfig,
  options: VectorStoreOptions,
): VectorStore {
  const registry: Registry = {
    upstash: createUpstashVectorStore,
    qdrant: createQdrantVectorStore,
  }

  const vectorStore = registry[config.provider](config, options)

  if (!vectorStore) {
    throw new InvalidArgumentError({
      code: 'UNSUPPORTED_VECTOR_STORE_PROVIDER',
      message: `Unsupported vector store provider "${config.provider}"`,
    })
  }

  return vectorStore
}
