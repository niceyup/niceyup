'use server'

import { auth } from '@workspace/auth'
import { addDays } from 'date-fns'
import { headers } from 'next/headers'

export async function getBillingCustomerState() {
  const customerState = await auth.api.state({
    headers: await headers(),
  })

  return customerState
}

export async function getActiveSubscription() {
  'use cache: private'

  // const customerState = await getBillingCustomerState()

  // const [activeSubscription] = customerState.activeSubscriptions

  const activeSubscription = {
    currentPeriodStart: new Date(),
    currentPeriodEnd: addDays(new Date(), 30),
  }

  return activeSubscription || null
}

export async function getBillingPortalUrl() {
  const portal = await auth.api.portal({
    headers: await headers(),
  })

  return portal.url
}
