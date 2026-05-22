import type { TaskRunContext } from '@trigger.dev/core/v3'
import { logger, tasks, usage } from '@trigger.dev/sdk'
import { billing } from '@workspace/billing'
import {
  type CurrencyCode,
  DEFAULT_CURRENCY_CODE,
} from '@workspace/billing/currency'
import { queries } from '@workspace/db/queries'

const PREFIX_TAG_ORGANIZATION = 'organization:'

function getOrganizationId({ ctx }: { ctx: TaskRunContext }) {
  const organizationId = ctx.run.tags
    .find((tag) => tag.startsWith(PREFIX_TAG_ORGANIZATION))
    ?.slice(PREFIX_TAG_ORGANIZATION.length)

  return organizationId
}

async function getCurrencyExchangeRate({ currency }: { currency: string }) {
  const currencyCode = currency.toUpperCase() as CurrencyCode

  if (currencyCode !== DEFAULT_CURRENCY_CODE) {
    const currencyExchangeRate = await billing.settings.currency.exchangeRate({
      from: DEFAULT_CURRENCY_CODE,
      to: currencyCode,
    })

    return currencyExchangeRate
  }

  return { code: DEFAULT_CURRENCY_CODE, value: 1 }
}

tasks.onStartAttempt(async ({ ctx }) => {
  const organizationId = getOrganizationId({ ctx })

  if (organizationId) {
    await logger.trace('Asserting compute usage within limit', async () => {
      await billing.limits.computeUsage.throwIfExceeded({
        referenceId: organizationId,
      })
    })
  }
})

tasks.onComplete(async ({ ctx }) => {
  const organizationId = getOrganizationId({ ctx })

  if (organizationId) {
    await logger.trace('Ingesting compute usage', async () => {
      const subscription = await queries.getSubscription({
        referenceId: organizationId,
      })

      if (subscription?.stripeCustomerId) {
        const currencyExchangeRate = await getCurrencyExchangeRate({
          currency: subscription.currency,
        })

        logger.info('Subscription', {
          currencyExchangeRate,
          subscription,
        })

        const currentUsage = usage.getCurrent()

        logger.info('Current usage', currentUsage)

        await billing.limits.computeUsage.ingest({
          stripeCustomerId: subscription.stripeCustomerId,
          value:
            (currentUsage.totalCostInCents / 100) * currencyExchangeRate.value,
          idempotencyKey: ctx.run.id,
        })
      } else {
        logger.error('Subscription not found', { referenceId: organizationId })
      }
    })
  }
})
