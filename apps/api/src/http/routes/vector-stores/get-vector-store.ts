import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          vectorStoreId: z.string(),
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { vectorStoreId } = request.params

      const vectorStore = await queries.ctx.getVectorStore(
        { organizationId: organization.id },
        { vectorStoreId },
      )

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
