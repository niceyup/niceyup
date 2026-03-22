import { schemaTask } from '@trigger.dev/sdk'
import { mockEmbeddingModel } from '@workspace/ai/mocks'
import type { IndexedSourceStatus } from '@workspace/core/sources'
import { db } from '@workspace/db'
import { and, eq, isNotNull, sql } from '@workspace/db/orm'
import {
  databaseSources,
  fileSources,
  files,
  indexedSources,
  knowledgeBases,
  sourceExplorerNodes,
  sourceOperations,
  sources,
} from '@workspace/db/schema'
import { storage } from '@workspace/storage'
import { z } from 'zod'
import { resolveVectorStore } from '../../agents'
import { InvalidArgumentError } from '../../erros'
import { env } from '../../lib/env'
import { sourceQueue } from './queue'

export type DeleteSourceTask = typeof deleteSourceTask

export const deleteSourceTask = schemaTask({
  id: 'delete-source',
  queue: sourceQueue,
  schema: z.object({
    sourceId: z.string(),
    destroy: z.boolean().optional(),
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
      })
      .from(sources)
      .leftJoin(sourceOperations, eq(sources.id, sourceOperations.sourceId))
      .where(eq(sources.id, payload.sourceId))
      .limit(1)

    const isQueued =
      source?.operation?.type === 'ingest-delete' &&
      source?.operation?.status === 'queued'

    if (!isQueued) {
      return {
        status: 'skipped',
        message: 'Job skipped because the status is no longer queued',
      }
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
      })
      .where(eq(sourceOperations.sourceId, payload.sourceId))

    let fileToDelete = null

    switch (source.type) {
      case 'file':
        const [fileSource] = await db
          .select()
          .from(fileSources)
          .where(eq(fileSources.sourceId, payload.sourceId))
          .limit(1)

        if (fileSource?.fileId) {
          const [file] = await db
            .select()
            .from(files)
            .where(eq(files.id, fileSource.fileId))
            .limit(1)

          if (file) {
            fileToDelete = file
          }
        }
        break

      case 'database':
        const [databaseSource] = await db
          .select()
          .from(databaseSources)
          .where(eq(databaseSources.sourceId, payload.sourceId))
          .limit(1)

        if (databaseSource?.fileId) {
          const [file] = await db
            .select()
            .from(files)
            .where(eq(files.id, databaseSource.fileId))
            .limit(1)

          if (file) {
            fileToDelete = file
          }
        }
        break
    }

    const completedIndexedSourcesToDelete = await db.transaction(async (tx) => {
      let completedIndexedSourcesToDelete: {
        status: IndexedSourceStatus
        knowledgeBaseId: string
        sourceId: string
      }[] = []

      if (payload.destroy) {
        await tx
          .delete(sourceExplorerNodes)
          .where(eq(sourceExplorerNodes.sourceId, payload.sourceId))

        completedIndexedSourcesToDelete = await tx
          .select({
            status: indexedSources.status,
            knowledgeBaseId: indexedSources.knowledgeBaseId,
            sourceId: indexedSources.sourceId,
          })
          .from(indexedSources)
          .where(
            and(
              eq(indexedSources.sourceId, payload.sourceId),
              eq(indexedSources.status, 'completed'),
            ),
          )

        await tx.delete(sources).where(eq(sources.id, payload.sourceId))

        if (fileToDelete) {
          await tx.delete(files).where(eq(files.id, fileToDelete.id))
        }
      } else {
        await tx
          .update(sourceExplorerNodes)
          .set({
            deletedAt: new Date(),
          })
          .where(eq(sourceExplorerNodes.sourceId, payload.sourceId))

        await tx
          .update(sources)
          .set({
            status: source.status === 'draft' ? 'draft' : 'ready',
            deletedAt: new Date(),
          })
          .where(eq(sources.id, payload.sourceId))

        const deletedIndexedSources = await tx
          .delete(indexedSources)
          .where(eq(indexedSources.sourceId, payload.sourceId))
          .returning({
            status: indexedSources.status,
            knowledgeBaseId: indexedSources.knowledgeBaseId,
            sourceId: indexedSources.sourceId,
          })

        completedIndexedSourcesToDelete = deletedIndexedSources.filter(
          ({ status }) => status === 'completed',
        )
      }

      return completedIndexedSourcesToDelete
    })

    if (completedIndexedSourcesToDelete?.length) {
      for (const indexedSource of completedIndexedSourcesToDelete) {
        const [knowledgeBase] = await db
          .select({
            id: knowledgeBases.id,
            vectorStoreId: knowledgeBases.vectorStoreId,
          })
          .from(knowledgeBases)
          .where(
            and(
              eq(knowledgeBases.id, indexedSource.knowledgeBaseId),
              isNotNull(knowledgeBases.vectorStoreId),
            ),
          )
          .limit(1)

        if (knowledgeBase?.vectorStoreId) {
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
        }
      }
    }

    if (payload.destroy) {
      await Promise.all([
        fileToDelete &&
          storage.delete({
            bucket: env.S3_ENGINE_BUCKET,
            key: fileToDelete.filePath,
          }),

        source.type === 'database' &&
          storage.deleteDirectory({
            bucket: env.S3_ENGINE_BUCKET,
            path: `/sources/${payload.sourceId}/`,
          }),
      ])
    }

    return {
      status: 'completed',
      message: 'Job completed successfully',
    }
  },
  catchError: async ({ payload, error }) => {
    if (error instanceof InvalidArgumentError) {
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
    if (output.status === 'completed' && !payload.destroy) {
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
