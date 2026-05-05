import { NiceyupError } from '@workspace/core/errros'
import { BaseError, type BaseErrorParams } from './base-error'

const name = 'NICEYUP_UnauthorizedError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export class UnauthorizedError extends BaseError {
  private readonly [symbol] = true

  constructor({
    code,
    message,
    cause,
  }: Omit<BaseErrorParams, 'status' | 'name'> = {}) {
    super({
      name,
      status: 401,
      code: code ?? 'UNAUTHORIZED',
      message: message ?? 'Unauthorized',
      cause,
    })
  }

  static isInstance(error: unknown): error is UnauthorizedError {
    return NiceyupError.hasMarker(error, marker)
  }
}
