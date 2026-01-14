import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { connectionAppSchema } from '@workspace/core/connections'
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
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          app: connectionAppSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              connections: z.array(
                z.object({
                  id: z.string(),
                  app: connectionAppSchema,
                  name: z.string(),
                }),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, app } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const connections = await queries.context.listConnections(context, {
        app,
      })

      return { connections }
    },
  )
}
