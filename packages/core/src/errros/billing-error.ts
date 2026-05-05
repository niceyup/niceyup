import { NiceyupError } from './niceyup-error'

const name = 'NICEYUP_BillingError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export class BillingError extends NiceyupError {
  private readonly [symbol] = true

  readonly plan?: string

  constructor({
    code = 'BILLING_ERROR',
    message = 'Billing error',
    cause,
    plan,
  }: {
    code?: string
    message?: string
    cause?: unknown
    plan?: string
  } = {}) {
    super({ name, code, message, cause })
    this.plan = plan
  }

  static isInstance(error: unknown): error is BillingError {
    return NiceyupError.hasMarker(error, marker)
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.plan !== undefined && { plan: this.plan }),
    }
  }
}
