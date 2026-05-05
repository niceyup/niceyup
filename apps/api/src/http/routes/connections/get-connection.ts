import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import {
  connectionAppSchema,
  connectionAuthenticationSchema,
} from '@workspace/core/connections'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function getConnection(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/connections/:connectionId',
    {
      schema: {
        tags: ['Connections'],
        description: 'Get connection details',
        operationId: 'getConnection',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          connectionId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              connection: z.object({
                id: z.string(),
                name: z.string(),
                app: connectionAppSchema,
                authentication: connectionAuthenticationSchema,
                settings: z.record(z.string(), z.unknown()).nullable(),
                credentials: z.record(z.string(), z.unknown()).nullable(),
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { connectionId } = request.params

      const connection = await queries.ctx.getConnection(
        { organizationId: organization.id },
        { connectionId },
      )

      if (!connection) {
        throw new BadRequestError({
          code: 'CONNECTION_NOT_FOUND',
          message: 'Connection not found or you don’t have access',
        })
      }

      return { connection }
    },
  )
}
