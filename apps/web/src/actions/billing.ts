'use server'

import { addDays, subDays } from 'date-fns'

// export async function getBillingCustomerState() {
//   const customerState = await auth.api.state({
//     headers: await headers(),
//   })

//   return customerState
// }

export async function getActiveSubscription() {
  'use cache: private'

  // const customerState = await getBillingCustomerState()

  // const [activeSubscription] = customerState.activeSubscriptions

  const activeSubscription = {
    currentPeriodStart: subDays(new Date(), 15),
    currentPeriodEnd: addDays(new Date(), 15),
  }

  return activeSubscription || null
}

export async function getBillingPortalUrl() {
  // const portal = await auth.api.portal({
  //   headers: await headers(),
  // })

  // return portal.url

  return 'https://billing.niceyup.com/portal'
}
