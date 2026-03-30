import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  validateVectorStore,
  vectorStoreProviderSchema,
} from '@workspace/core/vector-stores'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { vectorStores } from '@workspace/db/schema'
import { z } from 'zod'

export async function updateVectorStore(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/vector-stores/:vectorStoreId',
    {
      schema: {
        tags: ['Vector Stores'],
        description: 'Update a vector store',
        operationId: 'updateVectorStore',
        params: z.object({
          vectorStoreId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string().optional(),
          provider: vectorStoreProviderSchema.optional(),
          settings: z.record(z.string(), z.unknown()).nullish(),
          credentials: z.record(z.string(), z.unknown()).nullish(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { vectorStoreId } = request.params

      const {
        organizationId,
        organizationSlug,
        name,
        provider,
        settings,
        credentials,
      } = request.body

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

      let validatedData = undefined

      if (
        provider !== undefined ||
        settings !== undefined ||
        credentials !== undefined
      ) {
        validatedData = validateVectorStore({
          provider: provider ?? vectorStore.provider,
          settings,
          credentials,
        })
      }

      await db
        .update(vectorStores)
        .set({
          name,
          ...validatedData,
        })
        .where(eq(vectorStores.id, vectorStoreId))

      return reply.status(204).send()
    },
  )
}
