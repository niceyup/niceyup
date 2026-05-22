import { BillingError } from '@workspace/core/errros'
import { queries } from '@workspace/db/queries'

type GetSubscriptionParams =
  | {
      referenceId: string | null | undefined
      stripeCustomerId?: never
      stripeSubscriptionId?: never
    }
  | {
      referenceId?: never
      stripeCustomerId: string | null | undefined
      stripeSubscriptionId?: never
    }
  | {
      referenceId?: never
      stripeCustomerId?: never
      stripeSubscriptionId: string | null | undefined
    }

export async function getSubscription(params: GetSubscriptionParams) {
  let subscription = null

  if (params.stripeSubscriptionId) {
    subscription = await queries.getSubscription({
      stripeSubscriptionId: params.stripeSubscriptionId,
    })
  } else if (params.stripeCustomerId) {
    subscription = await queries.getSubscription({
      stripeCustomerId: params.stripeCustomerId,
    })
  } else if (params.referenceId) {
    subscription = await queries.getSubscription({
      referenceId: params.referenceId,
    })
  }

  return subscription
}

export async function getActiveSubscription(params: GetSubscriptionParams) {
  let subscription = null

  if (params.stripeSubscriptionId) {
    subscription = await queries.getSubscription({
      stripeSubscriptionId: params.stripeSubscriptionId,
    })
  } else if (params.stripeCustomerId) {
    subscription = await queries.getSubscription({
      stripeCustomerId: params.stripeCustomerId,
    })
  } else if (params.referenceId) {
    subscription = await queries.getSubscription({
      referenceId: params.referenceId,
    })
  }

  if (!subscription) {
    throw new BillingError({
      code: 'SUBSCRIPTION_NOT_FOUND',
      message: 'Subscription not found',
    })
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new BillingError({
      code: 'SUBSCRIPTION_NOT_ACTIVE',
      message: 'Subscription not active',
      plan: subscription.plan,
    })
  }

  if (
    !subscription.stripeCustomerId ||
    !subscription.stripeSubscriptionId ||
    !subscription.status ||
    !subscription.periodStart ||
    !subscription.periodEnd
  ) {
    throw new BillingError({
      code: 'SUBSCRIPTION_INCOMPLETE',
      message: 'Subscription is incomplete',
      plan: subscription.plan,
    })
  }

  return {
    id: subscription.id,
    plan: subscription.plan,
    currency: subscription.currency,
    referenceId: subscription.referenceId,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    status: subscription.status,
    periodStart: subscription.periodStart,
    periodEnd: subscription.periodEnd,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelAt: subscription.cancelAt,
    canceledAt: subscription.canceledAt,
    endedAt: subscription.endedAt,
    seats: subscription.seats,
    billingInterval: subscription.billingInterval,
    stripeScheduleId: subscription.stripeScheduleId,
  }
}
