import { type EmbeddingModel, embedMany } from '@workspace/ai'

export async function generateEmbeddings({
  embeddingModel,
  value,
}: {
  embeddingModel: EmbeddingModel
  value: string | string[]
}) {
  const chunks = Array.isArray(value) ? value : [value]

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  })

  return embeddings
}
