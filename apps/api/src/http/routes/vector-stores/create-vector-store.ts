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
import { vectorStores } from '@workspace/db/schema'
import { z } from 'zod'

export async function createVectorStore(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/vector-stores',
    {
      schema: {
        tags: ['Vector Stores'],
        description: 'Create a new vector store',
        operationId: 'createVectorStore',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string(),
          provider: vectorStoreProviderSchema,
          settings: z.record(z.string(), z.unknown()).nullish(),
          credentials: z.record(z.string(), z.unknown()).nullish(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              vectorStoreId: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

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

      const validatedData = validateVectorStore({
        provider,
        settings,
        credentials,
      })

      const [createdVectorStore] = await db
        .insert(vectorStores)
        .values({
          name,
          ...validatedData,
          organizationId: context.organizationId,
        })
        .returning({
          id: vectorStores.id,
        })

      if (!createdVectorStore) {
        throw new BadRequestError({
          code: 'VECTOR_STORE_NOT_CREATED',
          message: 'Vector store not created',
        })
      }

      return reply.status(201).send({
        vectorStoreId: createdVectorStore.id,
      })
    },
  )
}
