import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { connections } from '@workspace/db/schema'
import {
  connectionAppSchema,
  connectionSchema,
} from '@workspace/engine/connections'
import { z } from 'zod'

export async function createConnection(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/connections',
    {
      schema: {
        tags: ['Connections'],
        description: 'Create a new connection',
        operationId: 'createConnection',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          app: connectionAppSchema,
          name: z.string(),
          payload: z.record(z.string(), z.unknown()),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              connectionId: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, app, name, payload } =
        request.body

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const { payload: validatedPayload } = connectionSchema.parse({
        app,
        payload,
      })

      const [connection] = await db
        .insert(connections)
        .values({
          app,
          name,
          payload: validatedPayload,
          organizationId: context.organizationId,
        })
        .returning({
          id: connections.id,
        })

      if (!connection) {
        throw new BadRequestError({
          code: 'CONNECTION_NOT_CREATED',
          message: 'Connection not created',
        })
      }

      return reply.status(201).send({
        connectionId: connection.id,
      })
    },
  )
}
