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

export async function listConnections(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/connections',
    {
      schema: {
        tags: ['Connections'],
        description: 'Get all connections',
        operationId: 'listConnections',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
          app: connectionAppSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              connections: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  app: connectionAppSchema,
                  authentication: connectionAuthenticationSchema,
                  settings: z.record(z.string(), z.unknown()).nullable(),
                }),
              ),
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

      const { app } = request.query

      const connections = await queries.ctx.listConnections(
        { organizationId: organization.id },
        { app },
      )

      return { connections }
    },
  )
}
