import { schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { agents, sourceIndexes, sourceOperations } from '@workspace/db/schema'
import { vectorStore } from '@workspace/vector-store'
import { z } from 'zod'
import { InvalidArgumentError } from '../../erros'

export type DeleteSourceIndexingTask = typeof deleteSourceIndexingTask

export const deleteSourceIndexingTask = schemaTask({
  id: 'delete-source-indexing',
  schema: z.object({
    sourceIndexId: z.string(),
  }),
  run: async (payload) => {
    const [sourceIndex] = await db
      .select({
        id: sourceIndexes.id,
        status: sourceIndexes.status,
        operation: {
          id: sourceOperations.id,
          type: sourceOperations.type,
          status: sourceOperations.status,
        },
        agentId: sourceIndexes.agentId,
        sourceId: sourceIndexes.sourceId,
      })
      .from(sourceIndexes)
      .leftJoin(
        sourceOperations,
        eq(sourceIndexes.id, sourceOperations.sourceIndexId),
      )
      .where(eq(sourceIndexes.id, payload.sourceIndexId))
      .limit(1)

    const isQueued =
      sourceIndex?.operation?.type === 'index-delete' &&
      sourceIndex?.operation?.status === 'queued'

    if (!isQueued) {
      return {
        status: 'skipped',
        message: 'Job skipped because the status is no longer queued',
      }
    }

    const [agent] = await db
      .select({
        id: agents.id,
        embeddingModelSettingsId: agents.embeddingModelSettingsId,
        organizationId: agents.organizationId,
      })
      .from(agents)
      .where(eq(agents.id, sourceIndex.agentId))
      .limit(1)

    if (!agent) {
      throw new InvalidArgumentError({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
      })
    }

    if (!agent.organizationId) {
      throw new InvalidArgumentError({
        code: 'AGENT_ORGANIZATION_NOT_FOUND',
        message: 'Agent organization not found',
      })
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
      })
      .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))

    await vectorStore.delete({
      namespace: agent.organizationId,
      agentId: sourceIndex.agentId,
      sourceId: sourceIndex.sourceId,
    })

    return {
      status: 'completed',
      message: 'Job completed successfully',
    }
  },
  catchError: async ({ error }) => {
    if (error instanceof InvalidArgumentError) {
      return { skipRetrying: true }
    }
  },
  onFailure: async ({ payload, error }) => {
    await db
      .update(sourceOperations)
      .set({
        status: 'failed',
        error:
          error instanceof InvalidArgumentError
            ? { code: error.code, message: error.message }
            : { code: 'UNKNOWN_ERROR', message: 'Unknown error' },
      })
      .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))
  },
  onSuccess: async ({ payload, output }) => {
    if (output.status === 'completed') {
      await db
        .delete(sourceIndexes)
        .where(eq(sourceIndexes.id, payload.sourceIndexId))
    }
  },
})
