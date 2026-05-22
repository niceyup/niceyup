import type {
  BillingLimits,
  BillingMeters,
  BillingPlans,
} from '@workspace/core/billing'
import { env } from './env'

export type Plan = UserPlan | OrganizationPlan

export const USER_PLANS = ['plus'] as const

export const ORGANIZATION_PLANS = ['hobby', 'standard', 'advanced'] as const

export const PREMIUM_ORGANIZATION_PLANS = [
  'standard',
  'advanced',
] as const satisfies OrganizationPlan[]

export type UserPlan = (typeof USER_PLANS)[number]

export type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number]

export type PremiumOrganizationPlan =
  (typeof PREMIUM_ORGANIZATION_PLANS)[number]

export const ALLOWED_PLANS = {
  user: {
    plus: ['plus'],
  },
  organization: {
    advanced: ['advanced'],
    standard: ['advanced', 'standard'],
    hobby: ['advanced', 'standard', 'hobby'],
  },
} as const satisfies {
  user: Record<UserPlan, [UserPlan, ...UserPlan[]]>
  organization: Record<
    OrganizationPlan,
    [OrganizationPlan, ...OrganizationPlan[]]
  >
}

export const PLANS = {
  // plus: {
  //   slug: 'plus',
  //   planPriceId: env.STRIPE_PLUS_PLAN_PRICE_ID,
  //   aIUsagePriceId: env.STRIPE_PLUS_PLAN_AI_USAGE_PRICE_ID,
  // },
  hobby: {
    slug: 'hobby',
    planPriceId: env.STRIPE_HOBBY_PLAN_PRICE_ID,
    aIUsagePriceId: env.STRIPE_HOBBY_PLAN_AI_USAGE_PRICE_ID,
    computeUsagePriceId: env.STRIPE_HOBBY_PLAN_COMPUTE_USAGE_PRICE_ID,
  },
  standard: {
    slug: 'standard',
    planPriceId: env.STRIPE_STANDARD_PLAN_PRICE_ID,
    aIUsagePriceId: env.STRIPE_STANDARD_PLAN_AI_USAGE_PRICE_ID,
    computeUsagePriceId: env.STRIPE_STANDARD_PLAN_COMPUTE_USAGE_PRICE_ID,
  },
  advanced: {
    slug: 'advanced',
    planPriceId: env.STRIPE_ADVANCED_PLAN_PRICE_ID,
    aIUsagePriceId: env.STRIPE_ADVANCED_PLAN_AI_USAGE_PRICE_ID,
    computeUsagePriceId: env.STRIPE_ADVANCED_PLAN_COMPUTE_USAGE_PRICE_ID,
  },
} as const satisfies BillingPlans

export type Meter = 'ai-usage' | 'compute-usage'

export const METERS = {
  'ai-usage': {
    slug: 'ai-usage',
    meterId: env.STRIPE_AI_USAGE_METER_ID,
  },
  'compute-usage': {
    slug: 'compute-usage',
    meterId: env.STRIPE_COMPUTE_USAGE_METER_ID,
  },
} as const satisfies BillingMeters

export const LIMITS: BillingLimits = {
  // plus: {
  //   plan: 'plus',
  //   aiUsage: {
  //     USD: {
  //       code: 'USD',
  //       value: 5, // $5,00 USD
  //     },
  //     BRL: {
  //       code: 'BRL',
  //       value: 25, // R$25,00 BRL
  //     },
  //   },
  // },
  hobby: {
    plan: 'hobby',
    seats: {
      value: 1,
    },
    storageUsage: {
      value: 1 * 1024 * 1024 * 1024, // 1 GB
    },
    aiUsage: {},
    computeUsage: {},
  },
  standard: {
    plan: 'standard',
    seats: {
      value: 5,
    },
    storageUsage: {
      value: 10 * 1024 * 1024 * 1024, // 10 GB
    },
    aiUsage: {
      USD: {
        code: 'USD',
        value: 4, // $4,00 USD
      },
      BRL: {
        code: 'BRL',
        value: 20, // R$20,00 BRL
      },
    },
    computeUsage: {
      USD: {
        code: 'USD',
        value: 4, // $4,00 USD
      },
      BRL: {
        code: 'BRL',
        value: 20, // R$20,00 BRL
      },
    },
  },
  advanced: {
    plan: 'advanced',
    seats: {
      value: 10,
    },
    storageUsage: {
      value: 20 * 1024 * 1024 * 1024, // 20 GB
    },
    aiUsage: {
      USD: {
        code: 'USD',
        value: 10, // $10,00 USD
      },
      BRL: {
        code: 'BRL',
        value: 50, // R$50,00 BRL
      },
    },
    computeUsage: {
      USD: {
        code: 'USD',
        value: 10, // $10,00 USD
      },
      BRL: {
        code: 'BRL',
        value: 50, // R$50,00 BRL
      },
    },
  },
}
