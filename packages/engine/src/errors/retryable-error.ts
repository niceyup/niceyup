import { NiceyupError } from '@workspace/core/errros'

const name = 'NICEYUP_RetryableError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export class RetryableError extends NiceyupError {
  private readonly [symbol] = true

  constructor({
    code = 'RETRYABLE_ERROR',
    message = 'Retryable error',
    cause,
  }: {
    code?: string
    message?: string
    cause?: unknown
  } = {}) {
    super({ name, code, message, cause })
  }

  static isInstance(error: unknown): error is RetryableError {
    return NiceyupError.hasMarker(error, marker)
  }
}
