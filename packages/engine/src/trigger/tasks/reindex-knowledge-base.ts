import { schemaTask } from '@trigger.dev/sdk'
import { billing } from '@workspace/billing'
import { db } from '@workspace/db'
import { and, eq, gt, isNull, sql } from '@workspace/db/orm'
import {
  indexedSources,
  knowledgeBases,
  sourceOperations,
} from '@workspace/db/schema'
import { z } from 'zod'
import { resolveEmbeddingModelSettings, resolveVectorStore } from '../../agents'
import { RetryableError } from '../../errors'
import { indexSourceTask } from './index-source'
import { knowledgeBaseQueue } from './queue'

export type ReindexKnowledgeBaseTask = typeof reindexKnowledgeBaseTask

const BATCH_SIZE = 100

export const reindexKnowledgeBaseTask = schemaTask({
  id: 'reindex-knowledge-base',
  queue: knowledgeBaseQueue,
  schema: z.object({
    knowledgeBaseId: z.string(),
  }),
  run: async (payload, { ctx, signal }) => {
    const [knowledgeBase] = await db
      .select({
        id: knowledgeBases.id,
        status: knowledgeBases.status,
        vectorStoreId: knowledgeBases.vectorStoreId,
        embeddingModelSettingsId: knowledgeBases.embeddingModelSettingsId,
        organizationId: knowledgeBases.organizationId,
      })
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, payload.knowledgeBaseId))
      .limit(1)

    const isReindexing = knowledgeBase?.status === 'reindexing'

    if (!isReindexing) {
      return {
        status: 'skipped',
        message: 'Job skipped because the status is no longer reindexing',
      }
    }

    await db
      .update(knowledgeBases)
      .set({
        status: 'reindexing',
      })
      .where(eq(knowledgeBases.id, payload.knowledgeBaseId))

    const embeddingModel = await resolveEmbeddingModelSettings({
      modelSettingsId: knowledgeBase.embeddingModelSettingsId,
    })

    const createVectorStore = await resolveVectorStore({
      vectorStoreId: knowledgeBase.vectorStoreId,
    })

    const vectorStore = createVectorStore({
      namespace: knowledgeBase.id,
      embeddingModel: embeddingModel.model,
    })

    if (signal.aborted) {
      return {
        status: 'canceled',
        message: 'Job canceled by user',
      }
    }

    while (true) {
      const result = await db.execute(sql`
        WITH indexed_sources_ids_to_delete AS (
          SELECT ${indexedSources.id}
          FROM ${indexedSources}
          INNER JOIN ${sourceOperations}
            ON ${sourceOperations.indexedSourceId} = ${indexedSources.id}
          WHERE ${indexedSources.knowledgeBaseId} = ${payload.knowledgeBaseId}
            AND ${sourceOperations.type} = ${'index-delete'}
            AND ${sourceOperations.status} = ${'failed'}
          LIMIT ${BATCH_SIZE}
        )
        DELETE FROM ${indexedSources}
        USING indexed_sources_ids_to_delete ids_to_delete
        WHERE ${indexedSources.id} = ids_to_delete.id
        RETURNING ${indexedSources.id}
      `)

      if (!result.rowCount) {
        break
      }
    }

    while (true) {
      const result = await db.execute(sql`
        WITH source_operations_ids_to_delete AS (
          SELECT ${sourceOperations.id}
          FROM ${sourceOperations}
          JOIN ${indexedSources}
            ON ${sourceOperations.indexedSourceId} = ${indexedSources.id}
          WHERE ${indexedSources.knowledgeBaseId} = ${payload.knowledgeBaseId}
          LIMIT ${BATCH_SIZE}
        )
        DELETE FROM ${sourceOperations}
        USING source_operations_ids_to_delete ids_to_delete
        WHERE ${sourceOperations.id} = ids_to_delete.id
        RETURNING ${sourceOperations.id}
      `)

      if (!result.rowCount) {
        break
      }
    }

    await db
      .update(indexedSources)
      .set({
        status: 'idle',
      })
      .where(eq(indexedSources.knowledgeBaseId, payload.knowledgeBaseId))

    await vectorStore.deleteAll()

    let cursorIndexedSourceId: string | undefined

    while (true) {
      if (signal.aborted) {
        return {
          status: 'canceled',
          message: 'Job canceled by user',
        }
      }

      await billing.meters.processUsage.assertWithinLimit({
        referenceId: knowledgeBase.organizationId,
      })

      const indexedSourcesToIndex = await db
        .select({
          id: indexedSources.id,
        })
        .from(indexedSources)
        .leftJoin(
          sourceOperations,
          eq(indexedSources.id, sourceOperations.indexedSourceId),
        )
        .where(
          and(
            cursorIndexedSourceId
              ? gt(indexedSources.id, cursorIndexedSourceId)
              : undefined,
            isNull(sourceOperations.id),
            eq(indexedSources.status, 'idle'),
            eq(indexedSources.knowledgeBaseId, payload.knowledgeBaseId),
          ),
        )
        .orderBy(indexedSources.id)
        .limit(BATCH_SIZE)

      if (!indexedSourcesToIndex.length) {
        break
      }

      cursorIndexedSourceId =
        indexedSourcesToIndex[indexedSourcesToIndex.length - 1]?.id

      await db.insert(sourceOperations).values(
        indexedSourcesToIndex.map(({ id }) => ({
          indexedSourceId: id,
          type: 'index' as const,
          status: 'queued' as const,
        })),
      )

      await indexSourceTask.batchTriggerAndWait(
        indexedSourcesToIndex.map(({ id }) => ({
          payload: { indexedSourceId: id, reindexing: true },
          options: {
            concurrencyKey: payload.knowledgeBaseId,
            tags: [...ctx.run.tags, `indexed-source:${id}`],
          },
        })),
      )
    }

    return {
      status: 'completed',
      message: 'Job completed successfully',
    }
  },
  catchError: async ({ error }) => {
    if (!RetryableError.isInstance(error)) {
      return { skipRetrying: true }
    }
  },
  onComplete: async ({ payload }) => {
    await db
      .update(knowledgeBases)
      .set({
        status: 'ready',
      })
      .where(eq(knowledgeBases.id, payload.knowledgeBaseId))
  },
})
