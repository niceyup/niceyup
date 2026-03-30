import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  connectionAppSchema,
  connectionAuthenticationSchema,
} from '@workspace/core/connections'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

const connectionAppsSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(',') : v),
  z.array(connectionAppSchema),
)

export async function listConnectionSelectOptions(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/select-option/connections',
    {
      schema: {
        tags: ['Connections'],
        description: 'Get connections for select options',
        operationId: 'listConnectionSelectOptions',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          apps: connectionAppsSchema.optional(),
          search: z.string().max(100).default(''),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              meta: z.object({
                search: z.string(),
                count: z.number(),
              }),
              connections: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  app: connectionAppSchema,
                  authentication: connectionAuthenticationSchema,
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

      const { organizationId, organizationSlug, apps, search } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const connections = await queries.context.listConnectionSelectOptions(
        context,
        { apps, search },
      )

      return {
        meta: {
          search,
          count: connections.length,
        },
        connections,
      }
    },
  )
}
