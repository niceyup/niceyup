import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
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
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, provider } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const vectorStores = await queries.context.listVectorStores(context, {
        provider,
      })

      return { vectorStores }
    },
  )
}
