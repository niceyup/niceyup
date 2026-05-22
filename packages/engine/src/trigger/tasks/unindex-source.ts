import { schemaTask } from '@trigger.dev/sdk'
import { mockEmbeddingModel } from '@workspace/ai/mocks'
import { InvalidArgumentError, NiceyupError } from '@workspace/core/errros'
import { db } from '@workspace/db'
import { eq, sql } from '@workspace/db/orm'
import {
  indexedSources,
  knowledgeBases,
  sourceOperations,
} from '@workspace/db/schema'
import { z } from 'zod'
import { resolveVectorStore } from '../../agents'
import { RetryableError } from '../../errors'
import { indexedSourceQueue } from './queue'

export type UnindexSourceTask = typeof unindexSourceTask

export const unindexSourceTask = schemaTask({
  id: 'unindex-source',
  queue: indexedSourceQueue,
  schema: z.object({
    indexedSourceId: z.string(),
  }),
  run: async (payload, { ctx }) => {
    const isRetrying = ctx.attempt.number > 1

    const [indexedSource] = await db
      .select({
        id: indexedSources.id,
        status: indexedSources.status,
        operation: {
          id: sourceOperations.id,
          type: sourceOperations.type,
          status: sourceOperations.status,
        },
        knowledgeBaseId: indexedSources.knowledgeBaseId,
        sourceId: indexedSources.sourceId,
      })
      .from(indexedSources)
      .leftJoin(
        sourceOperations,
        eq(indexedSources.id, sourceOperations.indexedSourceId),
      )
      .where(eq(indexedSources.id, payload.indexedSourceId))
      .limit(1)

    if (!indexedSource) {
      throw new InvalidArgumentError({
        code: 'INDEXED_SOURCE_NOT_FOUND',
        message: 'Indexed source not found',
      })
    }

    const isQueued =
      indexedSource.operation?.type === 'index-delete' &&
      indexedSource.operation.status === 'queued'

    if (!isQueued && !isRetrying) {
      return {
        status: 'skipped',
        message: 'Job skipped because the status is no longer queued',
      }
    }

    const [knowledgeBase] = await db
      .select({
        id: knowledgeBases.id,
        status: knowledgeBases.status,
        vectorStoreId: knowledgeBases.vectorStoreId,
      })
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, indexedSource.knowledgeBaseId))
      .limit(1)

    if (!knowledgeBase) {
      throw new InvalidArgumentError({
        code: 'KNOWLEDGE_BASE_NOT_FOUND',
        message: 'Knowledge base not found',
      })
    }

    if (knowledgeBase.status !== 'ready') {
      throw new InvalidArgumentError({
        code: 'KNOWLEDGE_BASE_NOT_READY',
        message: 'Knowledge base is not ready',
      })
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
      })
      .where(eq(sourceOperations.indexedSourceId, payload.indexedSourceId))

    const createVectorStore = await resolveVectorStore({
      vectorStoreId: knowledgeBase.vectorStoreId,
    })

    const vectorStore = createVectorStore({
      namespace: knowledgeBase.id,
      // NOTE: using a mockEmbeddingModel because this operation only deletes data
      // from the vector store. No embeddings are generated, so the real
      // embedding model is not required.
      embeddingModel: mockEmbeddingModel,
    })

    await vectorStore.delete({
      sourceId: indexedSource.sourceId,
    })

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
      .where(eq(sourceOperations.indexedSourceId, payload.indexedSourceId))
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
      .where(eq(sourceOperations.indexedSourceId, payload.indexedSourceId))
  },
  onSuccess: async ({ payload, output }) => {
    if (output.status === 'completed') {
      await db
        .delete(indexedSources)
        .where(eq(indexedSources.id, payload.indexedSourceId))
    }
  },
})
