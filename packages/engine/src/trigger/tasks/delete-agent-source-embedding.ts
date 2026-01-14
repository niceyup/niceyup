import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { and, eq, notInArray } from '@workspace/db/orm'
import { agents, agentsToSources, sources } from '@workspace/db/schema'
import { vectorStore } from '@workspace/vector-store'
import { z } from 'zod'

export type DeleteAgentSourceEmbeddingTask =
  typeof deleteAgentSourceEmbeddingTask

export const deleteAgentSourceEmbeddingTask = schemaTask({
  id: 'delete-agent-source-embedding',
  schema: z.object({
    agentId: z.string(),
    sourceId: z.string(),
  }),
  run: async (payload) => {
    const [agentSourceEmbedding] = await db
      .select({
        agentId: agentsToSources.agentId,
        sourceId: agentsToSources.sourceId,
        status: agentsToSources.status,
        organizationId: agents.organizationId,
      })
      .from(agentsToSources)
      .innerJoin(agents, eq(agentsToSources.agentId, agents.id))
      .innerJoin(sources, eq(agentsToSources.sourceId, sources.id))
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
          notInArray(agentsToSources.status, ['queued', 'processing']),
        ),
      )
      .limit(1)

    if (!agentSourceEmbedding) {
      throw new AbortTaskRunError('Agent source embedding not found')
    }

    const { organizationId } = agentSourceEmbedding

    if (!organizationId) {
      throw new AbortTaskRunError('Organization not found')
    }

    await db
      .update(agentsToSources)
      .set({
        status: 'deleting',
      })
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
        ),
      )

    await vectorStore.delete({
      namespace: organizationId,
      agentId: payload.agentId,
      sourceId: payload.sourceId,
    })

    return {
      status: 'success',
      message: 'Agent source embedding deleted successfully',
    }
  },
  onFailure: async ({ payload }) => {
    await db
      .update(agentsToSources)
      .set({
        status: 'delete-failed',
      })
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
        ),
      )
  },
  onSuccess: async ({ payload }) => {
    await db
      .delete(agentsToSources)
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
        ),
      )
  },
})
