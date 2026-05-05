import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { vectorStoreProviderSchema } from '@workspace/core/vector-stores'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listVectorStores(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/vector-stores',
    {
      schema: {
        tags: ['Vector Stores'],
        description: 'Get all vector stores',
        operationId: 'listVectorStores',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
          provider: vectorStoreProviderSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              vectorStores: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  provider: vectorStoreProviderSchema,
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

      const { provider } = request.query

      const vectorStores = await queries.ctx.listVectorStores(
        { organizationId: organization.id },
        { provider },
      )

      return { vectorStores }
    },
  )
}
