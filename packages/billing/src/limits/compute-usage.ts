import { cache } from '@workspace/cache'
import { BillingError } from '@workspace/core/errros'
import { LIMITS, METERS } from '../lib/constants'
import { unixTimestamp } from '../lib/utils'
import { stripeClient } from '../stripe-client'
import { getActiveSubscription } from '../subscriptions'

function computeUsageKey(stripeCustomerId: string) {
  return `billing:meters:${METERS['compute-usage'].slug}:${stripeCustomerId}`
}

const CACHE_TTL_SECONDS = 5 * 60 // 5 minutes

async function getCachedValue(stripeCustomerId: string) {
  const key = computeUsageKey(stripeCustomerId)

  const cachedValue = await cache.get(key)

  if (cachedValue === null) {
    return null
  }

  const value = Number(cachedValue)

  if (Number.isNaN(value)) {
    return null
  }

  return value
}

async function setCachedValue(stripeCustomerId: string, value: number) {
  const key = computeUsageKey(stripeCustomerId)

  await cache.set(key, value)
  await cache.expire(key, CACHE_TTL_SECONDS)
}

async function deleteCachedValue(stripeCustomerId: string) {
  const key = computeUsageKey(stripeCustomerId)

  await cache.del(key)
}

type ValueParams = {
  stripeCustomerId: string
  startDate: Date
  endDate: Date
  /**
   * Maximum cached value allowed to be returned (exclusive).
   *
   * - If the cached value is strictly less than this threshold, it will be returned.
   * - If the cached value is greater than or equal to this threshold, fresh data
   *   will be fetched from Stripe and the cache will be updated.
   * - If not provided, the cached value will always be used when available.
   */
  cachedValueMaxThreshold?: number
}

export async function value(params: ValueParams) {
  const cachedValue = await getCachedValue(params.stripeCustomerId)

  const shouldUseCache =
    cachedValue !== null &&
    (params.cachedValueMaxThreshold === undefined ||
      cachedValue < params.cachedValueMaxThreshold)

  if (shouldUseCache) {
    return cachedValue
  }
  const meterEventSummaries =
    await stripeClient.billing.meters.listEventSummaries(
      METERS['compute-usage'].meterId,
      {
        customer: params.stripeCustomerId,
        start_time: unixTimestamp(params.startDate),
        end_time: unixTimestamp(params.endDate),
      },
    )

  const totalValue = meterEventSummaries.data.reduce(
    (sum, summary) => sum + summary.aggregated_value,
    0,
  )

  await setCachedValue(params.stripeCustomerId, totalValue)

  return totalValue
}

type IngestParams = {
  stripeCustomerId: string
  value: number
  idempotencyKey: string
}

export async function ingest(params: IngestParams) {
  if (!Number.isFinite(params.value)) {
    throw new Error('Invalid compute usage value to ingest')
  }

  await stripeClient.billing.meterEvents.create({
    event_name: METERS['compute-usage'].slug,
    payload: {
      value: params.value.toFixed(12),
      stripe_customer_id: params.stripeCustomerId,
    },
    identifier: params.idempotencyKey,
  })

  await deleteCachedValue(params.stripeCustomerId)
}

type ThrowIfExceededParams = (
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
) & {
  cb?: (error: unknown) => Promise<void>
}

export async function throwIfExceeded(params: ThrowIfExceededParams) {
  try {
    const subscription = await getActiveSubscription(params)

    const computeUsageLimit =
      LIMITS[subscription.plan]?.computeUsage[
        subscription.currency.toUpperCase()
      ]?.value ?? 0

    const computeUsage = await value({
      stripeCustomerId: subscription.stripeCustomerId,
      startDate: subscription.periodStart,
      endDate: subscription.periodEnd,
      cachedValueMaxThreshold: computeUsageLimit,
    })

    if (computeUsage > computeUsageLimit || !computeUsageLimit) {
      throw new BillingError({
        code: 'COMPUTE_USAGE_LIMIT_EXCEEDED',
        message: 'Compute usage limit exceeded',
        plan: subscription.plan,
      })
    }
  } catch (error) {
    await params.cb?.(error)

    throw error
  }
}

export const computeUsage = {
  value,
  ingest,
  throwIfExceeded,
}
