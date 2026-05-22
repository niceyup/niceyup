import { BillingError } from '@workspace/core/errros'
import { db } from '@workspace/db'
import { eq, sum } from '@workspace/db/orm'
import { files } from '@workspace/db/schema'
import { LIMITS } from '../lib/constants'
import { getActiveSubscription } from '../subscriptions'

type ValueParams = {
  referenceId: string
}

export async function value(params: ValueParams) {
  const [totalValue] = await db
    .select({
      totalSize: sum(files.fileSize),
    })
    .from(files)
    .where(eq(files.referenceId, params.referenceId))
    .limit(1)

  return Number(totalValue?.totalSize ?? 0)
}

type ThrowIfExceededParams = {
  referenceId: string | null | undefined
  cb?: (error: unknown) => Promise<void>
}

export async function throwIfExceeded(params: ThrowIfExceededParams) {
  try {
    const subscription = await getActiveSubscription(params)

    const storageUsageLimit = LIMITS[subscription.plan]?.storageUsage.value ?? 0

    const storageUsage = await value({
      referenceId: subscription.referenceId,
    })

    if (storageUsage > storageUsageLimit || !storageUsageLimit) {
      throw new BillingError({
        code: 'STORAGE_USAGE_LIMIT_EXCEEDED',
        message: 'Storage usage limit exceeded',
        plan: subscription.plan,
      })
    }
  } catch (error) {
    await params.cb?.(error)

    throw error
  }
}

export const storageUsage = {
  value,
  throwIfExceeded,
}
