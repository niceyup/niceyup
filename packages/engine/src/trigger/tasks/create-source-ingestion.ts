import { schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { sourceOperations, sources } from '@workspace/db/schema'
import { z } from 'zod'
import { InvalidArgumentError } from '../../erros'

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

    // TODO: implement logic to check if the source is ready

    // if (source.status !== 'ready') {
    //   throw new InvalidArgumentError({
    //     code: 'SOURCE_NOT_READY',
    //     message: 'Source is not ready',
    //   })
    // }

    const organizationId = source.organizationId

    if (!organizationId) {
      throw new InvalidArgumentError({
        code: 'SOURCE_ORGANIZATION_NOT_FOUND',
        message: 'Source organization not found',
      })
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
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
      .where(eq(sourceOperations.sourceId, payload.sourceId))
  },
  onSuccess: async ({ payload, output }) => {
    if (output.status === 'completed') {
      await db
        .update(sourceOperations)
        .set({
          status: 'completed',
          error: null,
        })
        .where(eq(sourceOperations.sourceId, payload.sourceId))
    }
  },
})
