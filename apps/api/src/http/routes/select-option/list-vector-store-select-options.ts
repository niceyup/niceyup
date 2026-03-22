import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
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
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, providers, search } =
        request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const vectorStores = await queries.context.listVectorStoreSelectOptions(
        context,
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
