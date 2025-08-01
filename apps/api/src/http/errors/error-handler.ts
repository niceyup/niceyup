import { env } from '@workspace/env'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { BadRequestError } from './bad-request-error'
import { BaseError, type BaseErrorParams } from './base-error'
import { UnauthorizedError } from './unauthorized-error'

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, _, reply) => {
  if (error instanceof ZodError) {
    reply.status(400).send({
      code: 'validation-error',
      message: 'Validation error',
      errors: error.flatten(),
    })
  }

  if (error instanceof BaseError) {
    const { status, code, message } = JSON.parse(
      error.message,
    ) as BaseErrorParams

    if (error instanceof BadRequestError) {
      reply.status(status || 400).send({ code, message })
    }

    if (error instanceof UnauthorizedError) {
      reply.status(401).send({ code, message })
    }
  }

  if (env.NODE_ENV !== 'production') {
    console.error(error)
  } else {
    // TODO: Here we should log to a external tool like DataDog/NewRelic/Sentry
  }

  reply.status(500).send({
    code: 'internal-server-error',
    message: 'Internal server error',
  })
}
