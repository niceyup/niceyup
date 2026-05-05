import { meters } from './meters'
import { stripeClient } from './stripe-client'
import { subscriptions } from './subscriptions'

export const billing = {
  subscriptions,
  meters,
  stripe: stripeClient,
}
