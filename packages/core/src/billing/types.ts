import type { z } from 'zod'
import type { billingLimits, billingMeters, billingPlans } from './schemas'

export type BillingPlans = z.infer<typeof billingPlans>

export type BillingMeters = z.infer<typeof billingMeters>

export type BillingLimits = z.infer<typeof billingLimits>
