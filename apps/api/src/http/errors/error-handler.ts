import { env } from '@/lib/env'
import { AuthError, NiceyupError } from '@workspace/core/errros'
import type { WebSocket } from '@workspace/realtime'
import type { FastifyInstance } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'
import { BadRequestError } from './bad-request-error'
import { BaseError } from './base-error'
import { UnauthorizedError } from './unauthorized-error'

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, _, reply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      errors: error.validation.map((error) => error.params.issue),
    })
  }

  if (isResponseSerializationError(error)) {
    reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      errors: error.cause.issues,
    })
  }

  if (error instanceof ZodError) {
    reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      errors: error.issues,
    })
  }

  if (BaseError.isInstance(error)) {
    if (BadRequestError.isInstance(error)) {
      reply
        .status(error.status)
        .send({ code: error.code, message: error.message })
    }

    if (UnauthorizedError.isInstance(error)) {
      reply.status(401).send({ code: error.code, message: error.message })
    }

    reply
      .status(error.status)
      .send({ code: error.code, message: error.message })
  }

  if (NiceyupError.isInstance(error)) {
    if (AuthError.isInstance(error)) {
      reply.status(401).send({ code: error.code, message: error.message })
    }

    reply.status(400).send({ code: error.code, message: error.message })
  }

  if (env.APP_ENV !== 'production') {
    console.error(error)
  } else {
    // TODO: here we should log to a external tool like DataDog/NewRelic/Sentry
  }

  reply.status(500).send({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  })
}

export const errorHandlerWebsocket = (error: Error, socket: WebSocket) => {
  if (BaseError.isInstance(error)) {
    socket.close(
      1008,
      JSON.stringify({ code: error.code, message: error.message }),
    )
  }

  socket.close(
    1011,
    JSON.stringify({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    }),
  )
}
