import type { EmbeddingModel, LanguageModel } from '@workspace/ai'
import type {
  EmbeddingModelSettings,
  LanguageModelSettings,
  ModelType,
} from '@workspace/core/models'
import type { Provider } from '@workspace/core/providers'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { modelSettings, providers } from '@workspace/db/schema'
import { providerRegistry } from '../provider-registry'

async function getModelSettings(params: {
  type: ModelType
  modelSettingsId: string | null | undefined
}) {
  if (!params.modelSettingsId) {
    return null
  }

  const [modelSettingsData] = await db
    .select({
      id: modelSettings.id,
      provider: modelSettings.provider,
      model: modelSettings.model,
      type: modelSettings.type,
      options: modelSettings.options,
    })
    .from(modelSettings)
    .where(
      and(
        eq(modelSettings.id, params.modelSettingsId),
        eq(modelSettings.type, params.type),
      ),
    )

  return modelSettingsData
}

async function getProviderSettings(params: {
  provider: string
}) {
  const [providerSettings] = await db
    .select({
      id: providers.id,
      provider: providers.provider,
      credentials: providers.credentials,
    })
    .from(providers)
    .where(eq(providers.provider, params.provider as Provider))

  return providerSettings
}

export async function resolveLanguageModelSettings(params: {
  modelSettingsId: string | null | undefined
}) {
  const modelSettings = await getModelSettings({
    type: 'language-model',
    modelSettingsId: params.modelSettingsId,
  })

  if (!modelSettings) {
    return null
  }

  const providerSettings = await getProviderSettings({
    provider: modelSettings.provider,
  })

  if (!providerSettings) {
    return null
  }

  const provider = providerRegistry({
    [providerSettings.provider]: providerSettings.credentials,
  })

  return {
    provider: providerSettings.provider,
    model: provider.languageModel(
      `${providerSettings.provider as 'openai'}/${modelSettings.model}`,
    ) as LanguageModel,
    options: modelSettings.options as LanguageModelSettings['options'] | null,
    settings: modelSettings,
  }
}

export async function resolveEmbeddingModelSettings(params: {
  modelSettingsId: string | null | undefined
}) {
  const modelSettings = await getModelSettings({
    type: 'embedding-model',
    modelSettingsId: params.modelSettingsId,
  })

  if (!modelSettings) {
    return null
  }

  const providerSettings = await getProviderSettings({
    provider: modelSettings.provider,
  })

  if (!providerSettings) {
    return null
  }

  const provider = providerRegistry({
    [providerSettings.provider]: providerSettings.credentials,
  })

  return {
    provider: providerSettings.provider,
    model: provider.embeddingModel(
      `${providerSettings.provider as 'openai'}/${modelSettings.model}`,
    ) as EmbeddingModel,
    options: modelSettings.options as EmbeddingModelSettings['options'] | null,
    settings: modelSettings,
  }
}
