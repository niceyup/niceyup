import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { models, providers } from '@workspace/db/schema'
import type { ModelType } from '@workspace/db/types'
import { providerRegistry } from '@workspace/engine/provider-registry'

async function _getModel(params: {
  type: ModelType
  modelId: string | null | undefined
}) {
  if (!params.modelId) {
    return null
  }

  const [model] = await db
    .select({
      id: models.id,
      type: models.type,
      model: models.model,
      options: models.options,
      provider: {
        id: providers.id,
        app: providers.app,
        payload: providers.payload,
      },
    })
    .from(models)
    .leftJoin(providers, eq(models.providerId, providers.id))
    .where(and(eq(models.id, params.modelId), eq(models.type, params.type)))

  return model
}

type CompatibleModel = `openai-compatible/${string}`

export async function toLanguageModel(params: {
  modelId: string | null | undefined
}) {
  const model = await _getModel({
    type: 'language_model',
    modelId: params.modelId,
  })

  if (!model?.provider || !model.provider.app) {
    return null
  }

  const provider = providerRegistry({
    [model.provider.app]: model.provider.payload,
  })

  return {
    provider: model.provider.app,
    model: provider.languageModel(model.model as CompatibleModel),
    options: model.options,
    _model: model,
  }
}

export async function toEmbeddingModel(params: {
  modelId: string | null | undefined
}) {
  const model = await _getModel({
    type: 'embedding_model',
    modelId: params.modelId,
  })

  if (!model?.provider || !model.provider.app) {
    return null
  }

  const provider = providerRegistry({
    [model.provider.app]: model.provider.payload,
  })

  return {
    provider: model.provider.app,
    model: provider.embeddingModel(model.model as CompatibleModel),
    options: model.options,
    _model: model,
  }
}
