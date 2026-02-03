export type BaseErrorParams = {
  status?: number
  code?: string
  message?: string
}

export class BaseError extends Error {
  readonly status: number
  readonly code: string

  constructor({ status, code, message }: BaseErrorParams = {}) {
    super(message || 'Internal server error')
    this.status = status || 500
    this.code = code || 'INTERNAL_SERVER_ERROR'
  }

  toJSON() {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
    }
  }
}
