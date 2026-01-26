import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, eq, inArray } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceIndexes, sourceOperations, sources } from '@workspace/db/schema'
import type { CreateSourceIndexingTask } from '@workspace/engine/tasks/create-source-indexing'
import type { DeleteSourceIndexingTask } from '@workspace/engine/tasks/delete-source-indexing'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function updateSourceIndexes(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/agents/:agentId/source-indexes',
    {
      schema: {
        tags: ['Source Indexes'],
        description: 'Update source indexes of an agent',
        operationId: 'updateSourceIndexes',
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          add: z.array(z.string()),
          remove: z.array(z.string()),
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

      const { organizationId, organizationSlug, add, remove } = request.body

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

      const sourcesSelectQuery = () =>
        db
          .select({
            id: sources.id,
            sourceIndexId: sourceIndexes.id,
            sourceOperationId: sourceOperations.id,
          })
          .from(sources)
          .leftJoin(
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

      const [sourcesAdd, sourcesRemove] = await Promise.all([
        sourcesSelectQuery().where(
          and(
            inArray(sources.id, add),
            eq(sources.organizationId, context.organizationId),
          ),
        ),
        sourcesSelectQuery().where(
          and(
            inArray(sources.id, remove),
            eq(sources.organizationId, context.organizationId),
          ),
        ),
      ])

      const sourcesAddIds = new Set(sourcesAdd.map((source) => source.id))
      const sourcesRemoveIds = new Set(sourcesRemove.map((source) => source.id))

      const sourceAddIdsNotFound = add.filter((id) => !sourcesAddIds.has(id))
      const sourceRemoveIdsNotFound = remove.filter(
        (id) => !sourcesRemoveIds.has(id),
      )

      if (sourceAddIdsNotFound.length || sourceRemoveIdsNotFound.length) {
        const sourceIdsNotFound = [
          ...sourceAddIdsNotFound,
          ...sourceRemoveIdsNotFound,
        ]

        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: `The following source IDs were not found or you don’t have access to them: [${sourceIdsNotFound.join(', ')}]`,
        })
      }

      const { addedSourceIndexes, removedSourceIndexes } = await db.transaction(
        async (tx) => {
          let addedSourceIndexes: { id: string }[] = []
          const removedSourceIndexes: { id: string }[] = []

          if (add.length) {
            const sourcesWithoutSourceIndex = [] // create source indexes
            const sourceIndexesWithoutSourceOperation = [] // create source operations
            const sourceIndexesWithSourceOperation = [] // update source operations

            for (const source of sourcesAdd) {
              if (!source.sourceIndexId) {
                sourcesWithoutSourceIndex.push({
                  id: source.id,
                })
                continue
              }

              if (!source.sourceOperationId) {
                sourceIndexesWithoutSourceOperation.push({
                  id: source.sourceIndexId,
                })
              } else {
                sourceIndexesWithSourceOperation.push({
                  id: source.sourceIndexId,
                })
              }
            }

            if (sourcesWithoutSourceIndex.length) {
              addedSourceIndexes = await tx
                .insert(sourceIndexes)
                .values(
                  sourcesWithoutSourceIndex.map((source) => ({
                    agentId,
                    sourceId: source.id,
                  })),
                )
                .returning({
                  id: sourceIndexes.id,
                })
            }

            const sourceOperationsToCreate = [
              ...addedSourceIndexes,
              ...sourceIndexesWithoutSourceOperation,
            ]

            if (sourceOperationsToCreate.length) {
              await tx.insert(sourceOperations).values(
                sourceOperationsToCreate.map(({ id }) => ({
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
          }

          if (remove.length) {
            const sourceIndexesWithoutSourceOperation = [] // create source operations
            const sourceIndexesWithSourceOperation = [] // update source operations

            for (const source of sourcesRemove) {
              if (!source.sourceIndexId) {
                continue
              }

              removedSourceIndexes.push({ id: source.sourceIndexId })

              if (!source.sourceOperationId) {
                sourceIndexesWithoutSourceOperation.push({
                  id: source.sourceIndexId,
                })
              } else {
                sourceIndexesWithSourceOperation.push({
                  id: source.sourceIndexId,
                })
              }
            }

            if (sourceIndexesWithoutSourceOperation.length) {
              await tx.insert(sourceOperations).values(
                sourceIndexesWithoutSourceOperation.map(({ id }) => ({
                  sourceIndexId: id,
                  type: 'index-delete' as const,
                  status: 'queued' as const,
                })),
              )
            }

            if (sourceIndexesWithSourceOperation.length) {
              await tx
                .update(sourceOperations)
                .set({
                  type: 'index-delete' as const,
                  status: 'queued' as const,
                })
                .where(
                  inArray(
                    sourceOperations.sourceIndexId,
                    sourceIndexesWithSourceOperation.map(({ id }) => id),
                  ),
                )
            }
          }

          return { addedSourceIndexes, removedSourceIndexes }
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
