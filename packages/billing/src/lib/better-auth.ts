import { type AuthorizeReferenceAction, stripe } from '@better-auth/stripe'
import { queries } from '@workspace/db/queries'
import { stripeClient } from '../stripe-client'
import { env } from './env'
import { plans } from './plans'

const BILLING_ONLY_ACTIONS: AuthorizeReferenceAction[] = [
  'upgrade-subscription',
  'cancel-subscription',
  'restore-subscription',
]

export function stripePlugin() {
  return stripe({
    stripeClient,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    createCustomerOnSignUp: true,
    subscription: {
      enabled: true,
      plans: async () => {
        return [
          // {
          //   name: plans.plus.name,
          //   priceId: plans.plus.priceId,
          //   lineItems: [{ price: plans.plus.meters.aiUsage.priceId }],
          // },
          {
            name: plans.hobby.name,
            priceId: plans.hobby.priceId,
            seatPriceId: plans.hobby.priceId,
            lineItems: [
              { price: plans.hobby.meters.aiUsage.priceId },
              { price: plans.hobby.meters.processUsage.priceId },
            ],
          },
          {
            name: plans.standard.name,
            priceId: plans.standard.priceId,
            seatPriceId: plans.standard.priceId,
            lineItems: [
              { price: plans.standard.meters.aiUsage.priceId },
              { price: plans.standard.meters.processUsage.priceId },
            ],
          },
          {
            name: plans.advanced.name,
            priceId: plans.advanced.priceId,
            seatPriceId: plans.advanced.priceId,
            lineItems: [
              { price: plans.advanced.meters.aiUsage.priceId },
              { price: plans.advanced.meters.processUsage.priceId },
            ],
          },
        ]
      },
      requireEmailVerification: true,
      authorizeReference: async ({ user, referenceId, action }) => {
        const membership = await queries.ctx.getMembership({
          userId: user.id,
          organizationId: referenceId,
        })

        if (BILLING_ONLY_ACTIONS.includes(action)) {
          return Boolean(membership?.isBilling)
        }

        return Boolean(membership?.isAdmin)
      },
    },
    organization: {
      enabled: true,
    },
  })
}
