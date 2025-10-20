import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import { getOrganizationIdentifier } from '@/lib/utils'
import type { FastifyTypedInstance } from '@/types/fastify'
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
          app: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              connections: z.array(
                z.object({
                  id: z.string(),
                  app: z.string(),
                  name: z.string(),
                  payload: z.record(z.string(), z.any()).nullable(),
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

      const context = {
        userId,
        ...getOrganizationIdentifier({
          organizationId,
          organizationSlug,
        }),
      }

      const connections = await queries.context.listConnections(context, {
        app,
      })

      return { connections }
    },
  )
}
