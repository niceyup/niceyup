import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceOperations } from '@workspace/db/schema'
import { runs } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function cancelSource(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources/:sourceId/cancel',
    {
      schema: {
        tags: ['Sources'],
        description: 'Cancel source indexing',
        operationId: 'cancelSource',
        params: z.object({
          sourceId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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

      const { organizationId, organizationSlug } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const source = await queries.context.getSource(context, { sourceId })

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      const [sourceOperation] = await db
        .select({
          id: sourceOperations.id,
          status: sourceOperations.status,
        })
        .from(sourceOperations)
        .where(eq(sourceOperations.sourceId, sourceId))
        .limit(1)

      const isRunning =
        sourceOperation?.status === 'queued' ||
        sourceOperation?.status === 'processing'

      if (isRunning) {
        const {
          data: [run],
        } = await runs.list({
          taskIdentifier: ['ingest-source', 'delete-source'],
          tag: [`organization:${context.organizationId}`, `source:${sourceId}`],
          status: ['EXECUTING'],
          limit: 1,
        })

        if (run) {
          // NOTE: if there is a job currently running, it will complete on its own.
          // No action is needed here.
        } else {
          await db
            .delete(sourceOperations)
            .where(eq(sourceOperations.sourceId, sourceId))
        }
      }

      return reply.status(204).send()
    },
  )
}
