import type {
  ModelProvider,
  ModelProviderCredentials,
  ModelProviderSettings,
} from '@workspace/core/model-providers'
import { createModelProviderRegistry } from '../create-model-provider-registry'

type ProviderSettings = {
  provider: ModelProvider
  settings: ModelProviderSettings | null
  credentials: ModelProviderCredentials | null
}

export function resolveModelProviderRegistry({
  providerSettings,
}: { providerSettings: ProviderSettings }) {
  if (providerSettings.provider.startsWith('openai-compatible/')) {
    const providerName = providerSettings.provider.replace(
      'openai-compatible/',
      '',
    )

    return createModelProviderRegistry({
      'openai-compatible': {
        name: providerName,
        ...providerSettings.credentials,
        ...providerSettings.settings,
      },
    })
  }

  return createModelProviderRegistry({
    [providerSettings.provider]: providerSettings.credentials,
  })
}
