import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { indexedSources, sourceOperations } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { runs } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function cancelSourceIndexing(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents/:agentId/knowledge-base/indexed-sources/:indexedSourceId/cancel',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Cancel source indexing',
        operationId: 'cancelSourceIndexing',
        params: z.object({
          agentId: z.string(),
          indexedSourceId: z.string(),
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

      const { agentId, indexedSourceId } = request.params

      const { organizationId, organizationSlug } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agent = await queries.context.getAgent(context, { agentId })

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const agentKnowledgeBase = await resolveAgentKnowledgeBase({
        agentId,
      })

      if (agentKnowledgeBase?.status !== 'ready') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_READY',
          message: 'Knowledge base is not ready',
        })
      }

      const [indexedSource] = await db
        .select({
          id: indexedSources.id,
          operation: {
            id: sourceOperations.id,
            status: sourceOperations.status,
          },
        })
        .from(indexedSources)
        .leftJoin(
          sourceOperations,
          eq(indexedSources.id, sourceOperations.indexedSourceId),
        )
        .where(
          and(
            eq(indexedSources.id, indexedSourceId),
            eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
          ),
        )
        .limit(1)

      if (!indexedSource) {
        throw new BadRequestError({
          code: 'INDEXED_SOURCE_NOT_FOUND',
          message: 'Indexed source not found or you don’t have access',
        })
      }

      const isRunning =
        indexedSource.operation?.status === 'queued' ||
        indexedSource.operation?.status === 'processing'

      if (isRunning) {
        const {
          data: [run],
        } = await runs.list({
          taskIdentifier: ['index-source', 'unindex-source'],
          tag: [
            `organization:${context.organizationId}`,
            `knowledge-base:${agentKnowledgeBase.id}`,
            `indexed-source:${indexedSourceId}`,
          ],
          status: ['EXECUTING'],
          limit: 1,
        })

        if (run) {
          // NOTE: if there is a job currently running, it will complete on its own.
          // No action is needed here.
        } else {
          await db
            .delete(sourceOperations)
            .where(eq(sourceOperations.indexedSourceId, indexedSourceId))
        }
      }

      return reply.status(204).send()
    },
  )
}
