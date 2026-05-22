import { type AuthorizeReferenceAction, stripe } from '@better-auth/stripe'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { subscriptions } from '@workspace/db/schema'
import { stripeClient } from '../stripe-client'
import { PLANS } from './constants'
import { env } from './env'

const MEMBER_ALLOWED_ACTIONS: AuthorizeReferenceAction[] = ['list-subscription']

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
          //   name: PLANS.plus.slug,
          //   priceId: PLANS.plus.planPriceId,
          //   prorationBehavior: 'always_invoice',
          //   lineItems: [{ price: PLANS.plus.aIUsagePriceId }],
          // },
          {
            name: PLANS.hobby.slug,
            priceId: PLANS.hobby.planPriceId,
            seatPriceId: PLANS.hobby.planPriceId,
            prorationBehavior: 'always_invoice',
            lineItems: [
              { price: PLANS.hobby.aIUsagePriceId },
              { price: PLANS.hobby.computeUsagePriceId },
            ],
          },
          {
            name: PLANS.standard.slug,
            priceId: PLANS.standard.planPriceId,
            seatPriceId: PLANS.standard.planPriceId,
            prorationBehavior: 'always_invoice',
            lineItems: [
              { price: PLANS.standard.aIUsagePriceId },
              { price: PLANS.standard.computeUsagePriceId },
            ],
          },
          {
            name: PLANS.advanced.slug,
            priceId: PLANS.advanced.planPriceId,
            seatPriceId: PLANS.advanced.planPriceId,
            prorationBehavior: 'always_invoice',
            lineItems: [
              { price: PLANS.advanced.aIUsagePriceId },
              { price: PLANS.advanced.computeUsagePriceId },
            ],
          },
        ]
      },
      requireEmailVerification: true,
      authorizeReference: async ({ user, referenceId, action }) => {
        if (MEMBER_ALLOWED_ACTIONS.includes(action)) {
          return true
        }

        const membership = await queries.ctx.getMembership({
          userId: user.id,
          organizationId: referenceId,
        })

        return Boolean(membership?.isBilling)
      },
      onSubscriptionComplete: async ({ stripeSubscription }) => {
        // Called when a subscription is successfully created via checkout

        await db
          .update(subscriptions)
          .set({
            currency: stripeSubscription.currency,
          })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
      },
      onSubscriptionCreated: async ({ stripeSubscription }) => {
        // Called when a subscription is created outside the checkout flow (e.g. Stripe dashboard)

        await db
          .update(subscriptions)
          .set({
            currency: stripeSubscription.currency,
          })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
      },
      getCheckoutSessionParams: async () => {
        return {
          params: {
            adaptive_pricing: {
              enabled: false,
            },
            allow_promotion_codes: true,
            payment_method_collection: 'always',
          },
        }
      },
    },
    organization: {
      enabled: true,
    },
  })
}
