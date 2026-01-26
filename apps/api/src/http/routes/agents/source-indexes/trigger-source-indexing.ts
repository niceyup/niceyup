import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, eq, inArray, isNull, or } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceIndexes, sourceOperations, sources } from '@workspace/db/schema'
import type { CreateSourceIndexingTask } from '@workspace/engine/tasks/create-source-indexing'
import type { DeleteSourceIndexingTask } from '@workspace/engine/tasks/delete-source-indexing'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function triggerSourceIndexing(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents/:agentId/source-indexes/trigger',
    {
      schema: {
        tags: ['Source Indexes'],
        description: 'Trigger source indexing of an agent',
        operationId: 'triggerSourceIndexing',
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          status: z.enum(['all', 'idle', 'failed']).default('all'),
          sources: z.array(z.string()).optional(),
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

      const { agentId } = request.params

      const {
        organizationId,
        organizationSlug,
        status,
        sources: _sources,
      } = request.body

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

      const listSources = await db
        .select({
          id: sources.id,
          sourceIndexId: sourceIndexes.id,
          sourceOperationId: sourceOperations.id,
          sourceOperationType: sourceOperations.type,
          sourceOperationStatus: sourceOperations.status,
        })
        .from(sources)
        .innerJoin(
          sourceIndexes,
          and(
            eq(sourceIndexes.sourceId, sources.id),
            eq(sourceIndexes.agentId, agentId),
          ),
        )
        .leftJoin(
          sourceOperations,
          eq(sourceOperations.sourceIndexId, sourceIndexes.id),
        )
        .where(
          and(
            _sources ? inArray(sources.id, _sources) : undefined,
            or(
              status === 'all' || status === 'idle'
                ? and(
                    eq(sourceIndexes.status, 'idle'),
                    isNull(sourceOperations.sourceIndexId),
                  )
                : undefined,
              status === 'all' || status === 'failed'
                ? eq(sourceOperations.status, 'failed')
                : undefined,
            ),
            eq(sources.organizationId, context.organizationId),
          ),
        )

      const sourceIds = new Set(listSources.map((source) => source.id))

      const sourceIdsNotFound = _sources?.filter((id) => !sourceIds.has(id))

      if (sourceIdsNotFound?.length) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: `The following source IDs were not found or you don’t have access to them: [${sourceIdsNotFound.join(', ')}]`,
        })
      }

      const { addedSourceIndexes, removedSourceIndexes } = await db.transaction(
        async (tx) => {
          const sourceIndexesWithoutSourceOperation = [] // create source operations
          const sourceIndexesWithSourceOperation = [] // update source operations

          const sourceIndexesWithSourceOperationFailedToDelete = [] // update source operations

          for (const source of listSources) {
            if (!source.sourceOperationId) {
              sourceIndexesWithoutSourceOperation.push({
                id: source.sourceIndexId,
              })
            } else {
              if (
                source.sourceOperationType === 'index-delete' &&
                source.sourceOperationStatus === 'failed'
              ) {
                sourceIndexesWithSourceOperationFailedToDelete.push({
                  id: source.sourceIndexId,
                })
                continue
              }

              sourceIndexesWithSourceOperation.push({
                id: source.sourceIndexId,
              })
            }
          }

          if (sourceIndexesWithoutSourceOperation.length) {
            await tx.insert(sourceOperations).values(
              sourceIndexesWithoutSourceOperation.map(({ id }) => ({
                sourceIndexId: id,
                type: 'index' as const,
                status: 'queued' as const,
              })),
            )
          }

          if (sourceIndexesWithSourceOperation.length) {
            await tx
              .update(sourceOperations)
              .set({
                type: 'index' as const,
                status: 'queued' as const,
              })
              .where(
                inArray(
                  sourceOperations.sourceIndexId,
                  sourceIndexesWithSourceOperation.map(({ id }) => id),
                ),
              )
          }

          if (sourceIndexesWithSourceOperationFailedToDelete.length) {
            await tx
              .update(sourceOperations)
              .set({
                type: 'index-delete' as const,
                status: 'queued' as const,
              })
              .where(
                inArray(
                  sourceOperations.sourceIndexId,
                  sourceIndexesWithSourceOperationFailedToDelete.map(
                    ({ id }) => id,
                  ),
                ),
              )
          }

          return {
            addedSourceIndexes: sourceIndexesWithoutSourceOperation,
            removedSourceIndexes:
              sourceIndexesWithSourceOperationFailedToDelete,
          }
        },
      )

      if (addedSourceIndexes.length) {
        await tasks.batchTrigger<CreateSourceIndexingTask>(
          'create-source-indexing',
          addedSourceIndexes.map(({ id }) => ({
            payload: { sourceIndexId: id },
          })),
        )
      }

      if (removedSourceIndexes.length) {
        await tasks.batchTrigger<DeleteSourceIndexingTask>(
          'delete-source-indexing',
          removedSourceIndexes.map(({ id }) => ({
            payload: { sourceIndexId: id },
          })),
        )
      }
      return reply.status(204).send()
    },
  )
}
