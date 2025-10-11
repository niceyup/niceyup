import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import { getOrganizationIdentifier } from '@/lib/utils'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listSources(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/sources',
    {
      schema: {
        tags: ['Sources'],
        description: 'Get all sources',
        operationId: 'listSources',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              sources: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  type: z.enum(['text', 'structured']),
                  databaseConnectionId: z.string().nullable(),
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

      const { organizationId, organizationSlug } = request.query

      const context = {
        userId,
        ...getOrganizationIdentifier({
          organizationId,
          organizationSlug,
        }),
      }

      const sources = await queries.context.listSources(context)

      return { sources }
    },
  )
}
