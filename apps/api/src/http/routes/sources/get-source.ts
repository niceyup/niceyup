import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { sourceTypeSchema } from '@workspace/core/sources'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function getSource(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/sources/:sourceId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Get source details',
        operationId: 'getSource',
        params: z.object({
          sourceId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              source: z.object({
                id: z.string(),
                name: z.string(),
                type: sourceTypeSchema,
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { sourceId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const source = await queries.context.getSource(context, { sourceId })

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      return { source }
    },
  )
}
