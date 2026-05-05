import type { ModelProvider } from '@workspace/core/model-providers'
import { and, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '../../db'
import { modelProviders } from '../../schema'

type ContextListModelProvidersParams = {
  organizationId: string
}

type ListModelProvidersParams = {
  provider?: ModelProvider
}

export async function listModelProviders(
  context: ContextListModelProvidersParams,
  params: ListModelProvidersParams,
) {
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
  organizationId: string
}

type GetModelProviderParams = {
  modelProviderId: string
}

export async function getModelProvider(
  context: ContextGetModelProviderParams,
  params: GetModelProviderParams,
) {
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
}

type ListModelProviderSelectOptionsParams = {
  providers?: ModelProvider[]
  search: string
}

export async function listModelProviderSelectOptions(
  context: ContextListModelProviderSelectOptionsParams,
  params: ListModelProviderSelectOptionsParams,
) {
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
