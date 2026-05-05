'use server'

import type { OrganizationTeamParams } from '@/lib/types'
import { auth } from '@workspace/auth'
import { queries } from '@workspace/db/queries'
import { headers } from 'next/headers'

type ContextGetActiveSubscriptionParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export async function getActiveSubscription(
  context: ContextGetActiveSubscriptionParams,
) {
  'use cache: private'

  const orgId = await queries.getOrganizationIdBySlug({
    organizationSlug: context.organizationSlug,
  })

  if (!orgId) {
    return null
  }

  const subscriptions = await auth.api.listActiveSubscriptions({
    query: {
      referenceId: orgId,
      customerType: 'organization',
    },
    headers: await headers(),
  })

  const activeSubscription = subscriptions.find(
    (sub) => sub.status === 'active' || sub.status === 'trialing',
  )

  if (!activeSubscription) {
    return null
  }

  return {
    id: activeSubscription.id,
    plan: activeSubscription.plan,
    status: activeSubscription.status,
    periodStart: activeSubscription.periodStart,
    periodEnd: activeSubscription.periodEnd,
    trialStart: activeSubscription.trialStart,
    trialEnd: activeSubscription.trialEnd,
    cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
    cancelAt: activeSubscription.cancelAt,
    canceledAt: activeSubscription.canceledAt,
    endedAt: activeSubscription.endedAt,
    seats: activeSubscription.seats,
  }
}

type ContextGetBillingPortalUrlParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

type GetBillingPortalUrlParams = {
  returnUrl?: string
}

export async function getBillingPortalUrl(
  context: ContextGetBillingPortalUrlParams,
  params: GetBillingPortalUrlParams = {},
) {
  const orgId = await queries.getOrganizationIdBySlug({
    organizationSlug: context.organizationSlug,
  })

  if (!orgId) {
    return null
  }

  const portal = await auth.api.createBillingPortal({
    body: {
      locale: 'auto',
      referenceId: orgId,
      customerType: 'organization',
      returnUrl: params.returnUrl,
    },
    headers: await headers(),
  })

  return portal.url
}
