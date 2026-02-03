export class InvalidArgumentError extends Error {
  readonly code: string

  constructor({
    code = 'INVALID_ARGUMENT',
    message = 'Invalid argument',
  }: { code?: string; message: string }) {
    super(message)
    this.code = code
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
    }
  }
}
