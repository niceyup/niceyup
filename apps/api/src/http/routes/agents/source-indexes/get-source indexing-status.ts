import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, count, eq, isNull } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceIndexes, sourceOperations } from '@workspace/db/schema'
import { z } from 'zod'

export async function getSourceIndexingStatus(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/source-indexes/status',
    {
      schema: {
        tags: ['Source Indexes'],
        description: 'Get source indexing status of an agent',
        operationId: 'getSourceIndexingStatus',
        params: z.object({
          agentId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              idleCount: z.number(),
              failedCount: z.number(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { agentId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agent = await queries.context.getAgent(context, {
        agentId,
      })

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const { idleCount, failedCount } = await db.transaction(async (tx) => {
        const [idleCount] = await tx
          .select({ count: count() })
          .from(sourceIndexes)
          .leftJoin(
            sourceOperations,
            eq(sourceIndexes.id, sourceOperations.sourceIndexId),
          )
          .where(
            and(
              eq(sourceIndexes.agentId, agentId),
              eq(sourceIndexes.status, 'idle'),
              isNull(sourceOperations.sourceIndexId),
            ),
          )

        const [failedCount] = await tx
          .select({ count: count() })
          .from(sourceIndexes)
          .innerJoin(
            sourceOperations,
            eq(sourceIndexes.id, sourceOperations.sourceIndexId),
          )
          .where(
            and(
              eq(sourceIndexes.agentId, agentId),
              eq(sourceOperations.status, 'failed'),
            ),
          )

        return {
          idleCount: idleCount?.count || 0,
          failedCount: failedCount?.count || 0,
        }
      })

      return { idleCount, failedCount }
    },
  )
}
