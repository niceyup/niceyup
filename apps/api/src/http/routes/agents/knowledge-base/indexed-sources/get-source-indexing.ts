import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { indexedSourceStatusSchema } from '@workspace/core/sources'
import { db } from '@workspace/db'
import { and, count, eq, isNotNull, isNull, lt, or } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { indexedSources, sourceOperations, sources } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { z } from 'zod'

export async function getSourceIndexing(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/knowledge-base/indexed-sources/:indexedSourceId',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Get indexed source',
        operationId: 'getSourceIndexing',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
          indexedSourceId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              indexedSource: z.object({
                id: z.string(),
                sourceId: z.string(),
                status: indexedSourceStatusSchema,
              }),
              summary: z.object({
                idle: z.boolean(),
                processing: z.boolean(),
                completed: z.boolean(),
                stale: z.boolean(),
                failed: z.boolean(),
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

      const { agentId, indexedSourceId } = request.params

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

      if (!agentKnowledgeBase) {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_FOUND',
          message: 'Knowledge base not found',
        })
      }

      if (agentKnowledgeBase.status === 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_REINDEXING',
          message: 'Knowledge base is reindexing',
        })
      }

      const validatedConfiguration =
        await agentKnowledgeBase.safeValidateConfiguration()

      if (validatedConfiguration.success !== true) {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_CONFIGURED',
          message: 'Knowledge base vector store or embedding model is not set',
        })
      }

      const [indexedSource] = await db
        .select({
          id: indexedSources.id,
          sourceId: indexedSources.sourceId,
          status: indexedSources.status,
        })
        .from(indexedSources)
        .where(eq(indexedSources.id, indexedSourceId))
        .limit(1)

      if (!indexedSource) {
        throw new BadRequestError({
          code: 'INDEXED_SOURCE_NOT_FOUND',
          message: 'Indexed source not found',
        })
      }

      const summary = await db.transaction(async (tx) => {
        const [idleCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .leftJoin(
            sourceOperations,
            eq(indexedSources.id, sourceOperations.indexedSourceId),
          )
          .where(
            and(
              eq(indexedSources.id, indexedSourceId),
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
              eq(indexedSources.id, indexedSourceId),
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
              eq(indexedSources.id, indexedSourceId),
              eq(indexedSources.status, 'completed'),
            ),
          )

        const [staleCount] = await tx
          .select({ count: count() })
          .from(indexedSources)
          .innerJoin(sources, eq(indexedSources.sourceId, sources.id))
          .where(
            and(
              eq(indexedSources.id, indexedSourceId),
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
              eq(indexedSources.id, indexedSourceId),
              eq(sourceOperations.status, 'failed'),
            ),
          )

        return {
          idle: Boolean(idleCount?.count),
          processing: Boolean(processingCount?.count),
          completed: Boolean(completedCount?.count),
          stale: Boolean(staleCount?.count),
          failed: Boolean(failedCount?.count),
        }
      })

      return { indexedSource, summary }
    },
  )
}
