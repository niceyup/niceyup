import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import type { DeleteIngestionSourceEmbeddingsTask } from '@workspace/engine/tasks/delete-ingestion-source-embeddings'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function deleteSource(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/sources/:sourceId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Delete a source',
        operationId: 'deleteSource',
        params: z.object({
          sourceId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          destroy: z.boolean().optional(),
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

      const { sourceId } = request.params

      const { organizationId, organizationSlug, destroy } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const source = await queries.context.getSource(context, {
        sourceId,
      })

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      await tasks.trigger<DeleteIngestionSourceEmbeddingsTask>(
        'delete-ingestion-source-embeddings',
        { sourceId, destroy },
      )

      return reply.status(204).send()
    },
  )
}
