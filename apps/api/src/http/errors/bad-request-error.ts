import { NiceyupError } from '@workspace/core/errros'
import { BaseError, type BaseErrorParams } from './base-error'

const name = 'NICEYUP_BadRequestError'
const marker = `niceyup.error.${name}`
const symbol = Symbol.for(marker)

export class BadRequestError extends BaseError {
  private readonly [symbol] = true

  constructor({
    status,
    code,
    message,
    cause,
  }: Omit<BaseErrorParams, 'name'> = {}) {
    super({
      name,
      status: status ?? 400,
      code: code ?? 'BAD_REQUEST',
      message: message ?? 'Bad request',
      cause,
    })
  }

  static isInstance(error: unknown): error is BadRequestError {
    return NiceyupError.hasMarker(error, marker)
  }
}
