import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { sourceOperations, sources } from '@workspace/db/schema'
import { z } from 'zod'

export type CreateSourceIngestionTask = typeof createSourceIngestionTask

export const createSourceIngestionTask = schemaTask({
  id: 'create-source-ingestion',
  schema: z.object({
    sourceId: z.string(),
  }),
  run: async (payload) => {
    const [source] = await db
      .select({
        id: sources.id,
        type: sources.type,
        status: sources.status,
        operation: {
          id: sourceOperations.id,
          type: sourceOperations.type,
          status: sourceOperations.status,
        },
        organizationId: sources.organizationId,
      })
      .from(sources)
      .leftJoin(sourceOperations, eq(sources.id, sourceOperations.sourceId))
      .where(eq(sources.id, payload.sourceId))
      .limit(1)

    const isQueued =
      source?.operation?.type === 'ingest' &&
      source?.operation?.status === 'queued'

    if (!isQueued) {
      return {
        status: 'skipped',
        message: 'Job skipped because the status is no longer queued',
      }
    }

    // if (source.status !== 'ready') {
    //   throw new AbortTaskRunError('Source is not ready')
    // }

    const organizationId = source.organizationId

    if (!organizationId) {
      throw new AbortTaskRunError('Source organization not found')
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
      })
      .where(eq(sourceOperations.sourceId, payload.sourceId))

    // TODO: implement logic to create ingestion source
    await db
      .update(sources)
      .set({
        status: 'completed',
      })
      .where(eq(sources.id, payload.sourceId))

    return {
      status: 'completed',
      message: 'Job completed successfully',
    }
  },
  onFailure: async ({ payload }) => {
    await db
      .update(sourceOperations)
      .set({
        status: 'failed',
      })
      .where(eq(sourceOperations.sourceId, payload.sourceId))
  },
  onSuccess: async ({ payload, output }) => {
    if (output.status === 'completed') {
      await db
        .update(sourceOperations)
        .set({
          status: 'completed',
        })
        .where(eq(sourceOperations.sourceId, payload.sourceId))
    }
  },
})
