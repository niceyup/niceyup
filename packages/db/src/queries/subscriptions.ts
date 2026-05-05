import { eq } from 'drizzle-orm'
import { db } from '../db'
import { subscriptions } from '../schema/auth'

type GetSubscriptionParams =
  | {
      referenceId: string
      stripeCustomerId?: never
      stripeSubscriptionId?: never
    }
  | {
      referenceId?: never
      stripeCustomerId: string
      stripeSubscriptionId?: never
    }
  | {
      referenceId?: never
      stripeCustomerId?: never
      stripeSubscriptionId: string
    }

export async function getSubscription(params: GetSubscriptionParams) {
  const [subscription] = await db
    .select({
      id: subscriptions.id,
      plan: subscriptions.plan,
      referenceId: subscriptions.referenceId,
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      status: subscriptions.status,
      periodStart: subscriptions.periodStart,
      periodEnd: subscriptions.periodEnd,
      trialStart: subscriptions.trialStart,
      trialEnd: subscriptions.trialEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      cancelAt: subscriptions.cancelAt,
      canceledAt: subscriptions.canceledAt,
      endedAt: subscriptions.endedAt,
      seats: subscriptions.seats,
      billingInterval: subscriptions.billingInterval,
      stripeScheduleId: subscriptions.stripeScheduleId,
    })
    .from(subscriptions)
    .where(
      params.stripeSubscriptionId !== undefined
        ? eq(subscriptions.stripeSubscriptionId, params.stripeSubscriptionId)
        : params.stripeCustomerId !== undefined
          ? eq(subscriptions.stripeCustomerId, params.stripeCustomerId)
          : eq(subscriptions.referenceId, params.referenceId),
    )
    .limit(1)

  return subscription || null
}
