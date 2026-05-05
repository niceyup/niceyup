import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { sourceStatusSchema, sourceTypeSchema } from '@workspace/core/sources'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          sourceId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              source: z.object({
                id: z.string(),
                name: z.string(),
                type: sourceTypeSchema,
                status: sourceStatusSchema,
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

      const { sourceId } = request.params

      const source = await queries.ctx.getSource(
        { organizationId: organization.id },
        { sourceId },
      )

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
