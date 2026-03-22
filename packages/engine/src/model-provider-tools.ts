import type { Tool } from '@workspace/ai'
import { google, openai } from '@workspace/ai/providers'
import type { ModelProvider } from '@workspace/core/model-providers'

export const modelProviderTools: {
  [provider in ModelProvider]?: {
    [tool: string]: (args: any) => Tool
  }
} = {
  openai: {
    'openai.image_generation': openai.tools.imageGeneration,
    'openai.web_search': openai.tools.webSearch,
  },
  google: {
    'google.google_search': google.tools.googleSearch,
  },
}
