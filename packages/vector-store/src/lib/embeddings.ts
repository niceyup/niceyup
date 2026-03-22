import { type Embedding, type EmbeddingModel, embedMany } from '@workspace/ai'

const BATCH_SIZE = 100

export async function generateEmbeddings({
  embeddingModel,
  value,
}: {
  embeddingModel: EmbeddingModel
  value: string | string[]
}) {
  const values = Array.isArray(value) ? value : [value]

  const embeddings: Embedding[] = []

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE)

    const { embeddings: batchEmbeddings } = await embedMany({
      model: embeddingModel,
      values: batch,
    })

    embeddings.push(...batchEmbeddings)
  }

  return embeddings
}
