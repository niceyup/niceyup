import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { vectorStores } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteVectorStore(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/vector-stores/:vectorStoreId',
    {
      schema: {
        tags: ['Vector Stores'],
        description: 'Delete a vector store',
        operationId: 'deleteVectorStore',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          vectorStoreId: z.string(),
        }),
        body: z.object({}),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
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

      await db.delete(vectorStores).where(eq(vectorStores.id, vectorStoreId))

      return reply.status(204).send()
    },
  )
}
