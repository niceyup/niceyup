import { z } from 'zod'

export const billingPlans = z.record(
  z.string(),
  z.object({
    slug: z.string(),
    planPriceId: z.string(),
    aIUsagePriceId: z.string().optional(),
    computeUsagePriceId: z.string().optional(),
  }),
)

export const billingMeters = z.record(
  z.string(),
  z.object({
    slug: z.string(),
    meterId: z.string(),
  }),
)

export const billingLimits = z.record(
  z.string(),
  z.object({
    plan: z.string(),
    seats: z.object({
      value: z.number(),
    }),
    storageUsage: z.object({
      value: z.number(),
    }),
    aiUsage: z.record(
      z.string(),
      z.object({
        code: z.string(),
        value: z.number(),
      }),
    ),
    computeUsage: z.record(
      z.string(),
      z.object({
        code: z.string(),
        value: z.number(),
      }),
    ),
  }),
)
