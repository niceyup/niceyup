import { schemaTask } from '@trigger.dev/sdk'
import { InvalidArgumentError, NiceyupError } from '@workspace/core/errros'
import { db } from '@workspace/db'
import { eq, sql } from '@workspace/db/orm'
import { sourceOperations, sources } from '@workspace/db/schema'
import { z } from 'zod'
import { RetryableError } from '../../errors'
import { sourceQueue } from './queue'

export type IngestSourceTask = typeof ingestSourceTask

export const ingestSourceTask = schemaTask({
  id: 'ingest-source',
  queue: sourceQueue,
  schema: z.object({
    sourceId: z.string(),
  }),
  run: async (payload, { ctx }) => {
    const isRetrying = ctx.attempt.number > 1

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
      })
      .from(sources)
      .leftJoin(sourceOperations, eq(sources.id, sourceOperations.sourceId))
      .where(eq(sources.id, payload.sourceId))
      .limit(1)

    if (!source) {
      throw new InvalidArgumentError({
        code: 'SOURCE_NOT_FOUND',
        message: 'Source not found',
      })
    }

    const isQueued =
      source.operation?.type === 'ingest' &&
      source.operation.status === 'queued'

    if (!isQueued && !isRetrying) {
      return {
        status: 'skipped',
        message: 'Job skipped because the status is no longer queued',
      }
    }

    const isReadyOrCompleted =
      source.status === 'ready' || source.status === 'completed'

    if (!isReadyOrCompleted) {
      return {
        status: 'skipped',
        message:
          'Job skipped because the status is no longer ready or completed',
      }
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
      })
      .where(eq(sourceOperations.sourceId, payload.sourceId))

    // TODO: Implement ingestion for other source types

    switch (source.type) {
      case 'text':
      case 'question-answer':
      case 'file':
        break

      default:
        throw new InvalidArgumentError({
          code: 'SOURCE_TYPE_NOT_SUPPORTED',
          message: 'Source type not supported',
        })
    }

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
  catchError: async ({ payload, error }) => {
    if (!RetryableError.isInstance(error)) {
      return { skipRetrying: true }
    }

    await db
      .update(sourceOperations)
      .set({
        attempts: sql`${sourceOperations.attempts} + 1`,
      })
      .where(eq(sourceOperations.sourceId, payload.sourceId))
  },
  onFailure: async ({ payload, error }) => {
    const errorObject = NiceyupError.isInstance(error)
      ? { code: error.code, message: error.message }
      : { code: 'UNKNOWN_ERROR', message: 'Unknown error' }

    await db
      .update(sourceOperations)
      .set({
        status: 'failed',
        error: errorObject,
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
