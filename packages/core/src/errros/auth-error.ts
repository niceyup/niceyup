import { NiceyupError } from '@workspace/core/errros'

const name = 'NICEYUP_AuthError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export class AuthError extends NiceyupError {
  private readonly [symbol] = true

  constructor({
    code = 'AUTH_ERROR',
    message = 'Authentication error',
    cause,
  }: {
    code?: string
    message?: string
    cause?: unknown
  } = {}) {
    super({ name, code, message, cause })
  }

  static isInstance(error: unknown): error is AuthError {
    return NiceyupError.hasMarker(error, marker)
  }
}
