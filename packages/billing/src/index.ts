import { limits } from './limits'
import { settings } from './settings'
import { stripeClient } from './stripe-client'
import { subscriptions } from './subscriptions'

export const billing = {
  stripe: stripeClient,
  settings,
  subscriptions,
  limits,
}
