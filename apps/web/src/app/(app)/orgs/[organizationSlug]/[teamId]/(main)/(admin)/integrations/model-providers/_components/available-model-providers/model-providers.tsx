import { CirclePlusIcon } from 'lucide-react'

export const availableModelProviders = {
  'openai-compatible': {
    value: 'openai-compatible' as const,
    label: 'OpenAI Compatible',
    description:
      'Seamlessly connect any OpenAI-compatible API with flexible, drop-in integration.',
    icon: <CirclePlusIcon className="size-4" />,
  },
  openai: {
    value: 'openai' as const,
    label: 'OpenAI',
    description:
      'Industry-leading AI models delivering powerful reasoning, creativity, and reliability.',
    image:
      'https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/ai-gateway/logos/openai.png',
  },
  google: {
    value: 'google' as const,
    label: 'Google',
    description:
      'Next-generation multimodal AI built for speed, scale, and real-world applications.',
    image:
      'https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/ai-gateway/logos/google.png',
  },
}

export type AvailableModelProvider = typeof availableModelProviders
