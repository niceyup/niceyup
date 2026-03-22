import type {
  VectorStore,
  VectorStoreConfig,
  VectorStoreOptions,
} from '../lib/vector-store'
import { createUpstashVectorStore } from './upstash'

export function createVectorStoreRegistry(
  config: VectorStoreConfig,
  options: VectorStoreOptions,
): VectorStore {
  const registry = {
    upstash: createUpstashVectorStore(config, options),
  }

  const vectorStore = registry[config.provider]

  if (!vectorStore) {
    throw new Error(`Unsupported vector store provider: ${config.provider}`)
  }

  return vectorStore
}
