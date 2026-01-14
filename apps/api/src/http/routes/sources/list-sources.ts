import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { sourceTypeSchema } from '@workspace/core/sources'
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
                  type: sourceTypeSchema,
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

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const sources = await queries.context.listSources(context)

      return { sources }
    },
  )
}
