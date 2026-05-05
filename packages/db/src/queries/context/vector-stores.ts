import type { VectorStoreProvider } from '@workspace/core/vector-stores'
import { and, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '../../db'
import { vectorStores } from '../../schema'

type ContextListVectorStoresParams = {
  organizationId: string
}

type ListVectorStoresParams = {
  provider?: VectorStoreProvider
}

export async function listVectorStores(
  context: ContextListVectorStoresParams,
  params: ListVectorStoresParams,
) {
  const listVectorStores = await db
    .select({
      id: vectorStores.id,
      name: vectorStores.name,
      provider: vectorStores.provider,
      settings: vectorStores.settings,
    })
    .from(vectorStores)
    .where(
      and(
        eq(vectorStores.organizationId, context.organizationId),
        params.provider
          ? eq(vectorStores.provider, params.provider)
          : undefined,
      ),
    )

  return listVectorStores
}

type ContextGetVectorStoreParams = {
  organizationId: string
}

type GetVectorStoreParams = {
  vectorStoreId: string
}

export async function getVectorStore(
  context: ContextGetVectorStoreParams,
  params: GetVectorStoreParams,
) {
  const [vectorStore] = await db
    .select({
      id: vectorStores.id,
      name: vectorStores.name,
      provider: vectorStores.provider,
      settings: vectorStores.settings,
      credentials: vectorStores.credentials,
    })
    .from(vectorStores)
    .where(
      and(
        eq(vectorStores.id, params.vectorStoreId),
        eq(vectorStores.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return vectorStore || null
}

type ContextListVectorStoreSelectOptionsParams = {
  organizationId: string
}

type ListVectorStoreSelectOptionsParams = {
  providers?: VectorStoreProvider[]
  search: string
}

export async function listVectorStoreSelectOptions(
  context: ContextListVectorStoreSelectOptionsParams,
  params: ListVectorStoreSelectOptionsParams,
) {
  const listVectorStores = await db
    .select({
      id: vectorStores.id,
      name: vectorStores.name,
      provider: vectorStores.provider,
      settings: vectorStores.settings,
    })
    .from(vectorStores)
    .where(
      and(
        eq(vectorStores.organizationId, context.organizationId),
        params.providers
          ? inArray(vectorStores.provider, params.providers)
          : undefined,
        or(
          ilike(vectorStores.name, `%${params.search}%`),
          ilike(vectorStores.provider, `%${params.search}%`),
        ),
      ),
    )
    .limit(10)

  return listVectorStores
}
