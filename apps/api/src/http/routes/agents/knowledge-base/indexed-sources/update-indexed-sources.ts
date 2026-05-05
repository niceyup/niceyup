import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { billing } from '@workspace/billing'
import { db } from '@workspace/db'
import { and, eq, inArray } from '@workspace/db/orm'
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
  indexedSourceId: string | null
  sourceOperationId: string | null
}

export async function updateIndexedSources(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/agents/:agentId/knowledge-base/indexed-sources',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Update indexed sources',
        operationId: 'updateIndexedSources',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          add: z
            .array(z.string())
            .max(BATCH_SIZE)
            .describe('Source IDs to add'),
          remove: z
            .array(z.string())
            .max(BATCH_SIZE)
            .describe('Source IDs to remove'),
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

      const { add: addSourceIds, remove: removeSourceIds } = request.body

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

      const sourcesSelectQuery = () =>
        db
          .select({
            id: sources.id,
            indexedSourceId: indexedSources.id,
            sourceOperationId: sourceOperations.id,
          })
          .from(sources)
          .leftJoin(
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

      const [sourcesToAdd, sourcesToRemove] = await Promise.all([
        sourcesSelectQuery().where(
          and(
            inArray(sources.id, addSourceIds),
            eq(sources.organizationId, organization.id),
          ),
        ),
        sourcesSelectQuery().where(
          and(
            inArray(sources.id, removeSourceIds),
            eq(sources.organizationId, organization.id),
          ),
        ),
      ])

      const sourceIdsToAddSet = new Set(sourcesToAdd.map((source) => source.id))
      const sourceIdsToRemoveSet = new Set(
        sourcesToRemove.map((source) => source.id),
      )

      const sourceIdsToAddNotFound = addSourceIds.filter(
        (id) => !sourceIdsToAddSet.has(id),
      )
      const sourceIdsToRemoveNotFound = removeSourceIds.filter(
        (id) => !sourceIdsToRemoveSet.has(id),
      )

      if (sourceIdsToAddNotFound.length || sourceIdsToRemoveNotFound.length) {
        const sourceIdsNotFound = [
          ...sourceIdsToAddNotFound,
          ...sourceIdsToRemoveNotFound,
        ]

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
        {
          addSourceIds,
          removeSourceIds,
          sourcesToAdd,
          sourcesToRemove,
        },
      )

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
    addSourceIds: string[]
    removeSourceIds: string[]
    sourcesToAdd: SourceRow[]
    sourcesToRemove: SourceRow[]
  },
) {
  await billing.meters.processUsage.assertWithinLimit({
    referenceId: context.organizationId,
  })

  const { addedIndexedSources, removedIndexedSources } = await db.transaction(
    async (tx) => {
      const addedIndexedSources: { id: string }[] = []
      const removedIndexedSources: { id: string }[] = []

      if (params.addSourceIds.length) {
        const sourcesWithoutIndexedSource: { id: string }[] = [] // create indexed sources
        const indexedSourcesWithoutOperation: { id: string }[] = [] // create source operations
        const indexedSourcesWithOperation: { id: string }[] = [] // update source operations

        for (const source of params.sourcesToAdd) {
          if (!source.indexedSourceId) {
            sourcesWithoutIndexedSource.push({
              id: source.id,
            })
            continue
          }

          addedIndexedSources.push({
            id: source.indexedSourceId,
          })

          if (!source.sourceOperationId) {
            indexedSourcesWithoutOperation.push({
              id: source.indexedSourceId,
            })
          } else {
            indexedSourcesWithOperation.push({
              id: source.indexedSourceId,
            })
          }
        }

        if (sourcesWithoutIndexedSource.length) {
          const newAddedIndexedSources = await tx
            .insert(indexedSources)
            .values(
              sourcesWithoutIndexedSource.map((source) => ({
                knowledgeBaseId: context.knowledgeBaseId,
                sourceId: source.id,
              })),
            )
            .returning({
              id: indexedSources.id,
            })

          addedIndexedSources.push(...newAddedIndexedSources)
          indexedSourcesWithoutOperation.push(...newAddedIndexedSources)
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
      }

      if (params.removeSourceIds.length) {
        const indexedSourcesWithoutOperation = [] // create source operations
        const indexedSourcesWithOperation = [] // update source operations

        for (const source of params.sourcesToRemove) {
          if (!source.indexedSourceId) {
            continue
          }

          removedIndexedSources.push({ id: source.indexedSourceId })

          if (!source.sourceOperationId) {
            indexedSourcesWithoutOperation.push({
              id: source.indexedSourceId,
            })
          } else {
            indexedSourcesWithOperation.push({
              id: source.indexedSourceId,
            })
          }
        }

        if (indexedSourcesWithoutOperation.length) {
          await tx.insert(sourceOperations).values(
            indexedSourcesWithoutOperation.map(({ id }) => ({
              indexedSourceId: id,
              type: 'index-delete' as const,
              status: 'queued' as const,
            })),
          )
        }

        if (indexedSourcesWithOperation.length) {
          await tx
            .update(sourceOperations)
            .set({
              type: 'index-delete' as const,
              status: 'queued' as const,
            })
            .where(
              inArray(
                sourceOperations.indexedSourceId,
                indexedSourcesWithOperation.map(({ id }) => id),
              ),
            )
        }
      }

      return { addedIndexedSources, removedIndexedSources }
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
