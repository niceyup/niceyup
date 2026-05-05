import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { name, provider, settings, credentials } = request.body

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
          organizationId: organization.id,
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
