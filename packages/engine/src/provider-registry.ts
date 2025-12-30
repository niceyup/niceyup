import { createProviderRegistry } from '@workspace/ai'
import {
  createAnthropic,
  createGoogleGenerativeAI,
  createOpenAI,
  createOpenAICompatible,
  createXai,
} from '@workspace/ai/providers'
import { DEFAULT_SEPARATOR } from './models/costs'

type ProviderOptions = {
  anthropic?: {
    apiKey?: string
  }
  google?: {
    apiKey?: string
  }
  openai?: {
    apiKey?: string
  }
  xai?: {
    apiKey?: string
  }
  'openai-compatible'?: {
    name: string
    baseURL: string
    apiKey?: string
    headers?: Record<string, string>
    queryParams?: Record<string, string>
  }
}

export function providerRegistry(options: ProviderOptions = {}) {
  const registry = createProviderRegistry(
    {
      anthropic: createAnthropic({
        apiKey: options.anthropic?.apiKey,
      }),
      google: createGoogleGenerativeAI({
        apiKey: options.google?.apiKey,
      }),
      openai: createOpenAI({
        apiKey: options.openai?.apiKey,
      }),
      xai: createXai({
        apiKey: options.xai?.apiKey,
      }),

      'openai-compatible': createOpenAICompatible({
        name: options['openai-compatible']?.name ?? 'openai',
        baseURL:
          options['openai-compatible']?.baseURL ?? 'https://api.openai.com/v1',
        apiKey: options['openai-compatible']?.apiKey,
        headers: options['openai-compatible']?.headers,
        queryParams: options['openai-compatible']?.queryParams,
      }),
    },
    {
      separator: DEFAULT_SEPARATOR,
    },
  )

  return registry
}
