import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { sourceStatusSchema, sourceTypeSchema } from '@workspace/core/sources'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              sources: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  type: sourceTypeSchema,
                  status: sourceStatusSchema,
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

      const sources = await queries.ctx.listSources({
        organizationId: organization.id,
      })

      return { sources }
    },
  )
}
