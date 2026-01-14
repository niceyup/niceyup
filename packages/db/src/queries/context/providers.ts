import type { Provider } from '@workspace/core/providers'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { providers } from '../../schema'

type ContextListProvidersParams = {
  organizationId: string
  isAdmin: boolean
}

type ListProvidersParams = {
  provider?: Provider
}

export async function listProviders(
  context: ContextListProvidersParams,
  params: ListProvidersParams,
) {
  if (!context.isAdmin) {
    return []
  }

  const listProviders = await db
    .select({
      id: providers.id,
      provider: providers.provider,
      credentials: providers.credentials,
      updatedAt: providers.updatedAt,
    })
    .from(providers)
    .where(
      and(
        eq(providers.organizationId, context.organizationId),
        params.provider ? eq(providers.provider, params.provider) : undefined,
      ),
    )

  return listProviders
}

type ContextGetProviderParams = {
  userId: string
  organizationId: string
  isAdmin: boolean
}

type GetProviderParams = {
  providerId: string
}

export async function getProvider(
  context: ContextGetProviderParams,
  params: GetProviderParams,
) {
  if (!context.isAdmin) {
    return null
  }

  const [provider] = await db
    .select({
      id: providers.id,
      provider: providers.provider,
      credentials: providers.credentials,
      updatedAt: providers.updatedAt,
    })
    .from(providers)
    .where(
      and(
        eq(providers.id, params.providerId),
        eq(providers.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return provider || null
}
