import { NiceyupError } from '@workspace/core/errros'

const name = 'NICEYUP_BaseError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export type BaseErrorParams = {
  name?: string
  status?: number
  code?: string
  message?: string
  cause?: unknown
}

export class BaseError extends NiceyupError {
  private readonly [symbol] = true

  readonly status: number

  constructor({
    name: errorName = name,
    status = 500,
    code = 'INTERNAL_SERVER_ERROR',
    message = 'Internal server error',
    cause,
  }: BaseErrorParams = {}) {
    super({ name: errorName, code, message, cause })
    this.status = status
  }

  static isInstance(error: unknown): error is BaseError {
    return NiceyupError.hasMarker(error, marker)
  }

  toJSON() {
    return {
      ...super.toJSON(),
      status: this.status,
    }
  }
}
