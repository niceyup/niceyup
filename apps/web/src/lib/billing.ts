import type { OrganizationPlan } from '@workspace/billing/constants'
import type { CurrencyCode } from '@workspace/billing/currency'

export type Plan = OrganizationPlan

type AvailablePlan = Record<
  Plan,
  {
    plan: Plan
    name: string
    description: string
    price: {
      monthly: Record<
        CurrencyCode,
        {
          code: CurrencyCode
          value: number
        }
      >
    }
    features: string[]
  }
>

export const availablePlans: AvailablePlan = {
  hobby: {
    plan: 'hobby',
    name: 'Hobby',
    description:
      'Perfect for exploring Niceyup and building your first AI-powered workflows.',
    price: {
      monthly: {
        USD: {
          code: 'USD',
          value: 0, // $0 USD
        },
        BRL: {
          code: 'BRL',
          value: 0, // R$0 BRL
        },
      },
    },
    features: [
      'Full platform access',
      'Create AI agents',
      'Connect knowledge sources',
      'Use multiple AI models',
      'Integrate MCP servers',
      'Connect external apps and services',
    ],
  },
  standard: {
    plan: 'standard',
    name: 'Standard',
    description:
      'Built for professionals and small organizations automating real work with AI.',
    price: {
      monthly: {
        USD: {
          code: 'USD',
          value: 5, // $5 USD
        },
        BRL: {
          code: 'BRL',
          value: 29, // R$29 BRL
        },
      },
    },
    features: [
      '$2 included in AI usage',
      '$2 included in compute usage',
      'Pay only for additional usage',
      'Up to 10 GB storage',
      'Up to 5 users',
      'Community support',
    ],
  },
  advanced: {
    plan: 'advanced',
    name: 'Advanced',
    description:
      'Advanced automation and collaboration for growing organizations.',
    price: {
      monthly: {
        USD: {
          code: 'USD',
          value: 20, // $20 USD
        },
        BRL: {
          code: 'BRL',
          value: 109, // R$109 BRL
        },
      },
    },
    features: [
      '$8 included in AI usage',
      '$8 included in compute usage',
      'Pay only for additional usage',
      'Up to 20 GB storage',
      'Up to 10 users',
      'Priority support',
    ],
  },
} as const
