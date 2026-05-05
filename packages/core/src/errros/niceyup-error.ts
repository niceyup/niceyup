const marker = 'niceyup.error'
const symbol = Symbol.for(marker)

export class NiceyupError extends Error {
  private readonly [symbol] = true

  readonly code: string
  readonly cause?: unknown

  constructor({
    name = 'NiceyupError',
    code = 'NICEYUP_ERROR',
    message = 'Niceyup error',
    cause,
  }: {
    name?: string
    code?: string
    message?: string
    cause?: unknown
  } = {}) {
    super(message)
    this.name = name
    this.code = code
    this.cause = cause
  }

  static isInstance(error: unknown): error is NiceyupError {
    return NiceyupError.hasMarker(error, marker)
  }

  protected static hasMarker(error: unknown, marker: string): boolean {
    const markerSymbol = Symbol.for(marker)
    return (
      error != null &&
      typeof error === 'object' &&
      markerSymbol in error &&
      typeof (error as any)[markerSymbol] === 'boolean' &&
      (error as any)[markerSymbol] === true
    )
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      ...(this.cause !== undefined && { cause: this.cause }),
    }
  }
}
