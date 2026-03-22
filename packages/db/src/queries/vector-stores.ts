import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { vectorStores } from '@workspace/db/schema'

type GetVectorStoreParams = {
  vectorStoreId: string
}

export async function getVectorStore(params: GetVectorStoreParams) {
  const [vectorStore] = await db
    .select({
      id: vectorStores.id,
      name: vectorStores.name,
      provider: vectorStores.provider,
      settings: vectorStores.settings,
      credentials: vectorStores.credentials,
    })
    .from(vectorStores)
    .where(and(eq(vectorStores.id, params.vectorStoreId)))
    .limit(1)

  return vectorStore || null
}
