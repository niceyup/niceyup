import { env } from './env'

export const meters = {
  aiUsage: {
    slug: 'ai-usage',
    name: 'AI Usage',
    meterId: env.STRIPE_AI_USAGE_METER_ID,
  },
  processUsage: {
    slug: 'process-usage',
    name: 'Process Usage',
    meterId: env.STRIPE_PROCESS_USAGE_METER_ID,
  },
} as const

export const plans = {
  // plus: {
  //   slug: 'plus',
  //   name: 'Plus',
  //   priceId: env.STRIPE_PLUS_PLAN_PRICE_ID,
  //   meters: {
  //     aiUsage: {
  //       ...meters.aiUsage,
  //       priceId: env.STRIPE_PLUS_PLAN_AI_USAGE_PRICE_ID,
  //       limits: {
  //         value: 5,
  //       },
  //     },
  //   },
  // },
  hobby: {
    slug: 'hobby',
    name: 'Hobby',
    priceId: env.STRIPE_HOBBY_PLAN_PRICE_ID,
    meters: {
      aiUsage: {
        ...meters.aiUsage,
        priceId: env.STRIPE_HOBBY_PLAN_AI_USAGE_PRICE_ID,
        limits: {
          value: 0,
        },
      },
      processUsage: {
        ...meters.processUsage,
        priceId: env.STRIPE_HOBBY_PLAN_PROCESS_USAGE_PRICE_ID,
        limits: {
          value: 0,
        },
      },
    },
    limits: {
      seats: 1,
    },
  },
  standard: {
    slug: 'standard',
    name: 'Standard',
    priceId: env.STRIPE_STANDARD_PLAN_PRICE_ID,
    meters: {
      aiUsage: {
        ...meters.aiUsage,
        priceId: env.STRIPE_STANDARD_PLAN_AI_USAGE_PRICE_ID,
        limits: {
          value: 5,
        },
      },
      processUsage: {
        ...meters.processUsage,
        priceId: env.STRIPE_STANDARD_PLAN_PROCESS_USAGE_PRICE_ID,
        limits: {
          value: 5,
        },
      },
    },
    limits: {
      seats: 5,
    },
  },
  advanced: {
    slug: 'advanced',
    name: 'Advanced',
    priceId: env.STRIPE_ADVANCED_PLAN_PRICE_ID,
    meters: {
      aiUsage: {
        ...meters.aiUsage,
        priceId: env.STRIPE_ADVANCED_PLAN_AI_USAGE_PRICE_ID,
        limits: {
          value: 10,
        },
      },
      processUsage: {
        ...meters.processUsage,
        priceId: env.STRIPE_ADVANCED_PLAN_PROCESS_USAGE_PRICE_ID,
        limits: {
          value: 10,
        },
      },
    },
    limits: {
      seats: 10,
    },
  },
} as const
