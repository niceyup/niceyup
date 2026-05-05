import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { vectorStoreProviderSchema } from '@workspace/core/vector-stores'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

const vectorStoreProvidersSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(',') : v),
  z.array(vectorStoreProviderSchema),
)

export async function listVectorStoreSelectOptions(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/select-option/vector-stores',
    {
      schema: {
        tags: ['Vector Stores'],
        description: 'Get vector stores for select options',
        operationId: 'listVectorStoreSelectOptions',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
          providers: vectorStoreProvidersSchema.optional(),
          search: z.string().max(100).default(''),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              meta: z.object({
                search: z.string(),
                count: z.number(),
              }),
              vectorStores: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  provider: vectorStoreProviderSchema,
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

      const { providers, search } = request.query

      const vectorStores = await queries.ctx.listVectorStoreSelectOptions(
        { organizationId: organization.id },
        { providers, search },
      )

      return {
        meta: {
          search,
          count: vectorStores.length,
        },
        vectorStores,
      }
    },
  )
}
