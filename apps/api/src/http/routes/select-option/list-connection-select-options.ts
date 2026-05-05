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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { apps, search } = request.query

      const connections = await queries.ctx.listConnectionSelectOptions(
        { organizationId: organization.id },
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
