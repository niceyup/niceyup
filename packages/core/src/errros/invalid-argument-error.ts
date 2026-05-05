import { NiceyupError } from '@workspace/core/errros'

const name = 'NICEYUP_InvalidArgumentError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export class InvalidArgumentError extends NiceyupError {
  private readonly [symbol] = true

  constructor({
    code = 'INVALID_ARGUMENT',
    message = 'Invalid argument',
    cause,
  }: {
    code?: string
    message?: string
    cause?: unknown
  } = {}) {
    super({ name, code, message, cause })
  }

  static isInstance(error: unknown): error is InvalidArgumentError {
    return NiceyupError.hasMarker(error, marker)
  }
}
