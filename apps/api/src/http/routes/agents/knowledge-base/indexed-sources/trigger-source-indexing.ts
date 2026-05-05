import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { billing } from '@workspace/billing'
import type {
  SourceOperationStatus,
  SourceOperationType,
} from '@workspace/core/sources'
import { db } from '@workspace/db'
import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
} from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { indexedSources, sourceOperations, sources } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import type { IndexSourceTask } from '@workspace/engine/tasks/index-source'
import type { UnindexSourceTask } from '@workspace/engine/tasks/unindex-source'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

const BATCH_SIZE = 100

type SourceRow = {
  id: string
  indexedSourceId: string
  sourceOperationId: string | null
  sourceOperationType: SourceOperationType | null
  sourceOperationStatus: SourceOperationStatus | null
}

export async function triggerSourceIndexing(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents/:agentId/knowledge-base/indexed-sources/trigger',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Trigger source indexing',
        operationId: 'triggerSourceIndexing',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          status: z.enum(['all', 'idle', 'stale', 'failed']).default('all'),
          sources: z
            .array(z.string())
            .max(BATCH_SIZE)
            .optional()
            .describe(
              'Source IDs to trigger indexing. If none are provided or the array is empty, all sources will be triggered',
            ),
        }),
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

      const { agentId } = request.params

      const { status, sources: sourceIds } = request.body

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

      const sourcesSelectQuery = ({
        sourceIds,
        cursorSourceId,
      }: { sourceIds?: string[]; cursorSourceId?: string }) =>
        db
          .select({
            id: sources.id,
            indexedSourceId: indexedSources.id,
            sourceOperationId: sourceOperations.id,
            sourceOperationType: sourceOperations.type,
            sourceOperationStatus: sourceOperations.status,
          })
          .from(sources)
          .innerJoin(
            indexedSources,
            and(
              eq(indexedSources.sourceId, sources.id),
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
            ),
          )
          .leftJoin(
            sourceOperations,
            eq(sourceOperations.indexedSourceId, indexedSources.id),
          )
          .where(
            and(
              sourceIds?.length ? inArray(sources.id, sourceIds) : undefined,
              cursorSourceId ? gt(sources.id, cursorSourceId) : undefined,
              or(
                status === 'all' || status === 'idle'
                  ? and(
                      eq(indexedSources.status, 'idle'),
                      isNull(sourceOperations.indexedSourceId),
                    )
                  : undefined,
                status === 'all' || status === 'stale'
                  ? and(
                      eq(indexedSources.status, 'completed'),
                      isNotNull(indexedSources.indexedAt),
                      lt(indexedSources.indexedAt, sources.contentUpdatedAt),
                    )
                  : undefined,
                status === 'all' || status === 'failed'
                  ? eq(sourceOperations.status, 'failed')
                  : undefined,
              ),
              eq(sources.organizationId, organization.id),
            ),
          )

      if (sourceIds?.length) {
        const listSources = await sourcesSelectQuery({ sourceIds })

        const sourceIdsSet = new Set(listSources.map((source) => source.id))

        const sourceIdsNotFound = sourceIds?.filter(
          (id) => !sourceIdsSet.has(id),
        )

        if (sourceIdsNotFound?.length) {
          throw new BadRequestError({
            code: 'SOURCE_NOT_FOUND',
            message: `The following source IDs were not found or you don’t have access to them: [${sourceIdsNotFound.join(', ')}]`,
          })
        }

        await manageIndexedSources(
          {
            organizationId: organization.id,
            knowledgeBaseId: agentKnowledgeBase.id,
          },
          { listSources },
        )
      } else {
        let cursorSourceId: string | undefined

        while (true) {
          const listSources = await sourcesSelectQuery({ cursorSourceId })
            .orderBy(sources.id)
            .limit(BATCH_SIZE)

          if (!listSources.length) {
            break
          }

          cursorSourceId = listSources[listSources.length - 1]?.id

          await manageIndexedSources(
            {
              organizationId: organization.id,
              knowledgeBaseId: agentKnowledgeBase.id,
            },
            { listSources },
          )
        }
      }

      return reply.status(204).send()
    },
  )
}

async function manageIndexedSources(
  context: {
    organizationId: string
    knowledgeBaseId: string
  },
  params: {
    listSources: SourceRow[]
  },
) {
  await billing.meters.processUsage.assertWithinLimit({
    referenceId: context.organizationId,
  })

  const { addedIndexedSources, removedIndexedSources } = await db.transaction(
    async (tx) => {
      const indexedSourcesWithoutOperation: { id: string }[] = [] // create source operations
      const indexedSourcesWithOperation: { id: string }[] = [] // update source operations

      const indexedSourcesWithOperationFailedToDelete: { id: string }[] = [] // update source operations

      for (const source of params.listSources) {
        if (!source.sourceOperationId) {
          indexedSourcesWithoutOperation.push({
            id: source.indexedSourceId,
          })
          continue
        }

        if (
          source.sourceOperationType === 'index-delete' &&
          source.sourceOperationStatus === 'failed'
        ) {
          indexedSourcesWithOperationFailedToDelete.push({
            id: source.indexedSourceId,
          })
          continue
        }

        indexedSourcesWithOperation.push({
          id: source.indexedSourceId,
        })
      }

      if (indexedSourcesWithoutOperation.length) {
        await tx.insert(sourceOperations).values(
          indexedSourcesWithoutOperation.map(({ id }) => ({
            indexedSourceId: id,
            type: 'index' as const,
            status: 'queued' as const,
          })),
        )
      }

      if (indexedSourcesWithOperation.length) {
        await tx
          .update(sourceOperations)
          .set({
            type: 'index' as const,
            status: 'queued' as const,
          })
          .where(
            inArray(
              sourceOperations.indexedSourceId,
              indexedSourcesWithOperation.map(({ id }) => id),
            ),
          )
      }

      if (indexedSourcesWithOperationFailedToDelete.length) {
        await tx
          .update(sourceOperations)
          .set({
            type: 'index-delete' as const,
            status: 'queued' as const,
          })
          .where(
            inArray(
              sourceOperations.indexedSourceId,
              indexedSourcesWithOperationFailedToDelete.map(({ id }) => id),
            ),
          )
      }

      return {
        addedIndexedSources: [
          ...indexedSourcesWithoutOperation,
          ...indexedSourcesWithOperation,
        ],
        removedIndexedSources: indexedSourcesWithOperationFailedToDelete,
      }
    },
  )

  if (addedIndexedSources.length) {
    await tasks.batchTrigger<IndexSourceTask>(
      'index-source',
      addedIndexedSources.map(({ id }) => ({
        payload: { indexedSourceId: id },
        options: {
          concurrencyKey: context.knowledgeBaseId,
          tags: [
            `organization:${context.organizationId}`,
            `knowledge-base:${context.knowledgeBaseId}`,
            `indexed-source:${id}`,
          ],
        },
      })),
    )
  }

  if (removedIndexedSources.length) {
    await tasks.batchTrigger<UnindexSourceTask>(
      'unindex-source',
      removedIndexedSources.map(({ id }) => ({
        payload: { indexedSourceId: id },
        options: {
          concurrencyKey: context.knowledgeBaseId,
          tags: [
            `organization:${context.organizationId}`,
            `knowledge-base:${context.knowledgeBaseId}`,
            `indexed-source:${id}`,
          ],
        },
      })),
    )
  }

  return { addedIndexedSources, removedIndexedSources }
}
