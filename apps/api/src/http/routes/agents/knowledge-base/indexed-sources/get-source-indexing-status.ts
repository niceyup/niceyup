import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { and, count, eq, isNotNull, isNull, lt, or } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { indexedSources, sourceOperations, sources } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { z } from 'zod'

export async function getSourceIndexingStatus(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/knowledge-base/indexed-sources/status',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Get indexed sources status',
        operationId: 'getSourceIndexingStatus',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              count: z.object({
                idle: z.number(),
                processing: z.number(),
                completed: z.number(),
                stale: z.number(),
                failed: z.number(),
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

      const { agentId } = request.params

      const agent = await queries.ctx.getAgent(
        { organizationId: organization.id },
        { agentId },
      )

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const agentKnowledgeBase = await resolveAgentKnowledgeBase({
        agentId,
      })

      if (agentKnowledgeBase?.status === 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_REINDEXING',
          message: 'Knowledge base is reindexing',
        })
      }

      const validatedConfiguration =
        await agentKnowledgeBase?.safeValidateConfiguration()

      if (!agentKnowledgeBase || validatedConfiguration?.success !== true) {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_CONFIGURED',
          message: 'Knowledge base vector store or embedding model is not set',
        })
      }

      const {
        idleCount,
        processingCount,
        completedCount,
        staleCount,
        failedCount,
      } = await db.transaction(async (tx) => {
        const [idleCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .leftJoin(
            sourceOperations,
            eq(indexedSources.id, sourceOperations.indexedSourceId),
          )
          .where(
            and(
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
              eq(indexedSources.status, 'idle'),
              isNull(sourceOperations.indexedSourceId),
            ),
          )

        const [processingCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .innerJoin(
            sourceOperations,
            eq(indexedSources.id, sourceOperations.indexedSourceId),
          )
          .where(
            and(
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
              or(
                eq(sourceOperations.status, 'queued'),
                eq(sourceOperations.status, 'processing'),
              ),
            ),
          )

        const [completedCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .where(
            and(
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
              eq(indexedSources.status, 'completed'),
            ),
          )

        const [staleCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .innerJoin(sources, eq(indexedSources.sourceId, sources.id))
          .where(
            and(
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
              eq(indexedSources.status, 'completed'),
              isNotNull(indexedSources.indexedAt),
              lt(indexedSources.indexedAt, sources.contentUpdatedAt),
            ),
          )

        const [failedCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .innerJoin(
            sourceOperations,
            eq(indexedSources.id, sourceOperations.indexedSourceId),
          )
          .where(
            and(
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
              eq(sourceOperations.status, 'failed'),
            ),
          )

        return {
          idleCount: idleCount?.count || 0,
          processingCount: processingCount?.count || 0,
          completedCount: completedCount?.count || 0,
          staleCount: staleCount?.count || 0,
          failedCount: failedCount?.count || 0,
        }
      })

      return {
        count: {
          idle: idleCount,
          processing: processingCount,
          completed: completedCount,
          stale: staleCount,
          failed: failedCount,
        },
      }
    },
  )
}
