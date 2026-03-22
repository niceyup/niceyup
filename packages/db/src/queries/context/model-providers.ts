import type { ModelProvider } from '@workspace/core/model-providers'
import { and, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '../../db'
import { modelProviders } from '../../schema'

type ContextListModelProvidersParams = {
  organizationId: string
  isAdmin: boolean
}

type ListModelProvidersParams = {
  provider?: ModelProvider
}

export async function listModelProviders(
  context: ContextListModelProvidersParams,
  params: ListModelProvidersParams,
) {
  if (!context.isAdmin) {
    return []
  }

  const listModelProviders = await db
    .select({
      id: modelProviders.id,
      name: modelProviders.name,
      provider: modelProviders.provider,
      settings: modelProviders.settings,
    })
    .from(modelProviders)
    .where(
      and(
        eq(modelProviders.organizationId, context.organizationId),
        params.provider
          ? eq(modelProviders.provider, params.provider)
          : undefined,
      ),
    )

  return listModelProviders
}

type ContextGetModelProviderParams = {
  userId: string
  organizationId: string
  isAdmin: boolean
}

type GetModelProviderParams = {
  modelProviderId: string
}

export async function getModelProvider(
  context: ContextGetModelProviderParams,
  params: GetModelProviderParams,
) {
  if (!context.isAdmin) {
    return null
  }

  const [modelProvider] = await db
    .select({
      id: modelProviders.id,
      name: modelProviders.name,
      provider: modelProviders.provider,
      settings: modelProviders.settings,
      credentials: modelProviders.credentials,
    })
    .from(modelProviders)
    .where(
      and(
        eq(modelProviders.id, params.modelProviderId),
        eq(modelProviders.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return modelProvider || null
}

type ContextListModelProviderSelectOptionsParams = {
  organizationId: string
  isAdmin: boolean
}

type ListModelProviderSelectOptionsParams = {
  providers?: ModelProvider[]
  search: string
}

export async function listModelProviderSelectOptions(
  context: ContextListModelProviderSelectOptionsParams,
  params: ListModelProviderSelectOptionsParams,
) {
  if (!context.isAdmin) {
    return []
  }

  const listModelProviders = await db
    .select({
      id: modelProviders.id,
      name: modelProviders.name,
      provider: modelProviders.provider,
      settings: modelProviders.settings,
    })
    .from(modelProviders)
    .where(
      and(
        eq(modelProviders.organizationId, context.organizationId),
        params.providers
          ? inArray(modelProviders.provider, params.providers)
          : undefined,
        or(
          ilike(modelProviders.name, `%${params.search}%`),
          ilike(modelProviders.provider, `%${params.search}%`),
        ),
      ),
    )
    .limit(10)

  return listModelProviders
}
