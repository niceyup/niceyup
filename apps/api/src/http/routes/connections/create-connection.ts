import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import {
  connectionAppSchema,
  connectionAuthenticationSchema,
  validateConnection,
} from '@workspace/core/connections'
import { db } from '@workspace/db'
import { connections } from '@workspace/db/schema'
import { z } from 'zod'

export async function createConnection(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/connections',
    {
      schema: {
        tags: ['Connections'],
        description: 'Create a new connection',
        operationId: 'createConnection',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
          name: z.string(),
          app: connectionAppSchema,
          authentication: connectionAuthenticationSchema,
          settings: z.record(z.string(), z.unknown()).nullish(),
          credentials: z.record(z.string(), z.unknown()).nullish(),
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { name, app, authentication, settings, credentials } = request.body

      const validatedData = validateConnection({
        app,
        authentication,
        settings,
        credentials,
      })

      const [connection] = await db
        .insert(connections)
        .values({
          name,
          ...validatedData,
          organizationId: organization.id,
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
