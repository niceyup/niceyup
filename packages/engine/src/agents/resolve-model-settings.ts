import {
  defaultEmbeddingSettingsMiddleware,
  defaultSettingsMiddleware,
  extractReasoningMiddleware,
  wrapEmbeddingModel,
  wrapLanguageModel,
} from '@workspace/ai'
import { InvalidArgumentError } from '@workspace/core/errros'
import type {
  EmbeddingModelSettings,
  LanguageModelSettings,
} from '@workspace/core/models'
import { queries } from '@workspace/db/queries'
import { resolveModelProviderRegistry } from './resolve-model-provider'

async function resolveLanguageModelSettingsOptions({
  provider,
  options,
}: {
  provider: string
  options?: LanguageModelSettings['options'] | null
}) {
  const isOpenAICompatible = provider.startsWith('openai-compatible/')

  const providerName = isOpenAICompatible
    ? provider.replace('openai-compatible/', '')
    : provider

  const {
    maxOutputTokens,
    temperature,
    topP,
    presencePenalty,
    frequencyPenalty,

    ...restOptions
  } = options ?? {}

  const providerOptions: Record<string, any> = {
    [providerName]: restOptions,

    ...(isOpenAICompatible ? { openaiCompatible: restOptions } : {}),
  }

  return {
    maxOutputTokens,
    temperature,
    topP,
    presencePenalty,
    frequencyPenalty,

    providerOptions,
  }
}

async function resolveEmbeddingModelSettingsOptions({
  provider,
  options,
}: {
  provider: string
  options?: EmbeddingModelSettings['options'] | null
}) {
  const isOpenAICompatible = provider.startsWith('openai-compatible/')

  const providerName = isOpenAICompatible
    ? provider.replace('openai-compatible/', '')
    : provider

  const { ...restOptions } = options ?? {}

  const providerOptions: Record<string, any> = {
    [providerName]: restOptions,

    ...(isOpenAICompatible ? { openaiCompatible: restOptions } : {}),
  }

  return {
    providerOptions,
  }
}

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

  if (!modelSettings.provider) {
    throw new InvalidArgumentError({
      code: 'LANGUAGE_MODEL_SETTINGS_PROVIDER_NOT_SET',
      message: 'Language model settings provider is not set',
    })
  }

  const providerSettings = modelSettings.provider

  const provider = resolveModelProviderRegistry({ providerSettings })

  const modelSettingsOptions = await resolveLanguageModelSettingsOptions({
    provider: providerSettings.provider,
    options: modelSettings.options,
  })

  const providerId = providerSettings.provider.startsWith('openai-compatible/')
    ? 'openai-compatible'
    : providerSettings.provider
  const modelId = modelSettings.model

  const enhancedLanguageModel = wrapLanguageModel({
    model: provider.languageModel(`${providerId}/${modelId}`),
    middleware: [
      extractReasoningMiddleware({ tagName: 'think' }),
      defaultSettingsMiddleware({ settings: modelSettingsOptions }),
    ],
  })

  return {
    provider: providerSettings.provider,
    model: enhancedLanguageModel,
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

  if (!modelSettings.provider) {
    throw new InvalidArgumentError({
      code: 'EMBEDDING_MODEL_SETTINGS_PROVIDER_NOT_SET',
      message: 'Embedding model settings provider is not set',
    })
  }

  const providerSettings = modelSettings.provider

  const provider = resolveModelProviderRegistry({ providerSettings })

  const modelSettingsOptions = await resolveEmbeddingModelSettingsOptions({
    provider: providerSettings.provider,
    options: modelSettings.options,
  })

  const providerId = providerSettings.provider.startsWith('openai-compatible/')
    ? 'openai-compatible'
    : providerSettings.provider
  const modelId = modelSettings.model

  const enhancedEmbeddingModel = wrapEmbeddingModel({
    model: provider.embeddingModel(`${providerId}/${modelId}`),
    middleware: defaultEmbeddingSettingsMiddleware({
      settings: modelSettingsOptions,
    }),
  })

  return {
    provider: providerSettings.provider,
    model: enhancedEmbeddingModel,
  }
}
