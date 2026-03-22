import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { vectorStoreProviderSchema } from '@workspace/core/vector-stores'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function getVectorStore(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/vector-stores/:vectorStoreId',
    {
      schema: {
        tags: ['Vector Stores'],
        description: 'Get vector store details',
        operationId: 'getVectorStore',
        params: z.object({
          vectorStoreId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              vectorStore: z.object({
                id: z.string(),
                name: z.string(),
                provider: vectorStoreProviderSchema,
                settings: z.record(z.string(), z.unknown()).nullable(),
                credentials: z.record(z.string(), z.unknown()).nullable(),
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

      const { vectorStoreId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const vectorStore = await queries.context.getVectorStore(context, {
        vectorStoreId,
      })

      if (!vectorStore) {
        throw new BadRequestError({
          code: 'VECTOR_STORE_NOT_FOUND',
          message: 'Vector store not found or you don’t have access',
        })
      }

      return { vectorStore }
    },
  )
}
