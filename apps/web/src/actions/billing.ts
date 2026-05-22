'use server'

import type { Plan } from '@/lib/billing'
import { env } from '@/lib/env'
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

export async function getBillingPortalUrl(
  context: ContextGetBillingPortalUrlParams,
) {
  const orgId = await queries.getOrganizationIdBySlug({
    organizationSlug: context.organizationSlug,
  })

  if (!orgId) {
    return null
  }

  try {
    const portal = await auth.api.createBillingPortal({
      body: {
        locale: 'auto',
        referenceId: orgId,
        customerType: 'organization',
        returnUrl: `${env.NEXT_PUBLIC_WEB_URL}/orgs/${context.organizationSlug}/~/settings/billing`,
      },
      headers: await headers(),
    })

    return portal.url
  } catch {
    return null
  }
}

type ContextUpgradeSubscriptionParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

type UpgradeSubscriptionParams = {
  plan: Plan
}

export async function upgradeSubscription(
  context: ContextUpgradeSubscriptionParams,
  params: UpgradeSubscriptionParams,
) {
  const orgId = await queries.getOrganizationIdBySlug({
    organizationSlug: context.organizationSlug,
  })

  if (!orgId) {
    return null
  }

  const { url } = await auth.api.upgradeSubscription({
    body: {
      plan: params.plan,
      referenceId: orgId,
      customerType: 'organization',
      locale: 'auto',
      successUrl: `${env.NEXT_PUBLIC_WEB_URL}/orgs/${context.organizationSlug}/billing/success`,
      cancelUrl: `${env.NEXT_PUBLIC_WEB_URL}/orgs/${context.organizationSlug}/billing/plans`,
      returnUrl: `${env.NEXT_PUBLIC_WEB_URL}/orgs/${context.organizationSlug}/~/settings/billing`,
    },
    headers: await headers(),
  })

  return url
}
