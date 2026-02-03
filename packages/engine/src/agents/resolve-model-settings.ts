import type { EmbeddingModel, LanguageModel } from '@workspace/ai'
import type {
  EmbeddingModelSettings,
  LanguageModelSettings,
} from '@workspace/core/models'
import { queries } from '@workspace/db/queries'
import { InvalidArgumentError } from '../erros'
import { providerRegistry } from '../provider-registry'

export async function resolveLanguageModelSettings(params: {
  modelSettingsId: string | null | undefined
}) {
  const modelSettings = params.modelSettingsId
    ? await queries.getModelSettings({
        type: 'language-model',
        modelSettingsId: params.modelSettingsId,
      })
    : null

  if (!modelSettings) {
    throw new InvalidArgumentError({
      code: 'LANGUAGE_MODEL_SETTINGS_NOT_SET',
      message: 'Language model settings are not set',
    })
  }

  const providerSettings = await queries.getProviderSettings({
    provider: modelSettings.provider,
  })

  if (!providerSettings) {
    throw new InvalidArgumentError({
      code: 'LANGUAGE_MODEL_PROVIDER_SETTINGS_NOT_SET',
      message: 'Provider settings are not set for this language model',
    })
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
  }
}

export async function resolveEmbeddingModelSettings(params: {
  modelSettingsId: string | null | undefined
}) {
  const modelSettings = params.modelSettingsId
    ? await queries.getModelSettings({
        type: 'embedding-model',
        modelSettingsId: params.modelSettingsId,
      })
    : null

  if (!modelSettings) {
    throw new InvalidArgumentError({
      code: 'EMBEDDING_MODEL_SETTINGS_NOT_SET',
      message: 'Embedding model settings are not set',
    })
  }

  const providerSettings = await queries.getProviderSettings({
    provider: modelSettings.provider,
  })

  if (!providerSettings) {
    throw new InvalidArgumentError({
      code: 'EMBEDDING_MODEL_PROVIDER_SETTINGS_NOT_SET',
      message: 'Provider settings are not set for this embedding model',
    })
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
  }
}
