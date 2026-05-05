import type { TaskRunContext } from '@trigger.dev/core/v3'
import { logger, tasks, usage } from '@trigger.dev/sdk'
import { billing } from '@workspace/billing'
import { queries } from '@workspace/db/queries'

const PREFIX_TAG_ORGANIZATION = 'organization:'

function getOrganizationId({ ctx }: { ctx: TaskRunContext }) {
  const organizationId = ctx.run.tags
    .find((tag) => tag.startsWith(PREFIX_TAG_ORGANIZATION))
    ?.slice(PREFIX_TAG_ORGANIZATION.length)

  return organizationId
}

tasks.onStartAttempt(async ({ ctx }) => {
  const organizationId = getOrganizationId({ ctx })

  if (organizationId) {
    await logger.trace('Asserting process usage within limit', async () => {
      await billing.meters.processUsage.assertWithinLimit({
        referenceId: organizationId,
      })
    })
  }
})

tasks.onComplete(async ({ ctx }) => {
  const organizationId = getOrganizationId({ ctx })

  if (organizationId) {
    await logger.trace('Ingesting process usage', async () => {
      const subscription = await queries.getSubscription({
        referenceId: organizationId,
      })

      if (subscription?.stripeCustomerId) {
        const currentUsage = usage.getCurrent()

        logger.info('Current usage', currentUsage)

        await billing.meters.processUsage.ingest({
          stripeCustomerId: subscription.stripeCustomerId,
          value: currentUsage.totalCostInCents,
          idempotencyKey: ctx.run.id,
        })
      } else {
        logger.error('Subscription not found', { referenceId: organizationId })
      }
    })
  }
})
