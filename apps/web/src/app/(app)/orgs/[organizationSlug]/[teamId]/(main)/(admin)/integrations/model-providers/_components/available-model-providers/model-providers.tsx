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
  },
  google: {
    value: 'google' as const,
    label: 'Google',
    description:
      'Next-generation multimodal AI built for speed, scale, and real-world applications.',
  },
}

export type AvailableModelProvider = typeof availableModelProviders
