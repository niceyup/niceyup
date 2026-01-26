import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import {
  databaseSources,
  fileSources,
  files,
  sourceExplorerNodes,
  sourceIndexes,
  sourceOperations,
  sources,
} from '@workspace/db/schema'
import { storage } from '@workspace/storage'
import { vectorStore } from '@workspace/vector-store'
import { z } from 'zod'
import { env } from '../../lib/env'

export type DeleteSourceIngestionTask = typeof deleteSourceIngestionTask

export const deleteSourceIngestionTask = schemaTask({
  id: 'delete-source-ingestion',
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
        organizationId: sources.organizationId,
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

    let _file = null

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
            _file = file
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
            _file = file
          }
        }
        break
    }

    await db.transaction(async (tx) => {
      if (payload.destroy) {
        await tx
          .delete(sourceExplorerNodes)
          .where(
            and(
              eq(sourceExplorerNodes.sourceId, payload.sourceId),
              eq(sourceExplorerNodes.organizationId, organizationId),
            ),
          )

        await tx
          .delete(sources)
          .where(
            and(
              eq(sources.id, payload.sourceId),
              eq(sources.organizationId, organizationId),
            ),
          )

        if (_file) {
          await tx.delete(files).where(eq(files.id, _file.id))
        }
      } else {
        await tx
          .update(sourceExplorerNodes)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(sourceExplorerNodes.sourceId, payload.sourceId),
              eq(sourceExplorerNodes.organizationId, organizationId),
            ),
          )

        await tx
          .update(sources)
          .set({
            status: source.status === 'draft' ? 'draft' : 'ready',
            deletedAt: new Date(),
          })
          .where(
            and(
              eq(sources.id, payload.sourceId),
              eq(sources.organizationId, organizationId),
            ),
          )

        await tx
          .delete(sourceIndexes)
          .where(eq(sourceIndexes.sourceId, payload.sourceId))
      }
    })

    await Promise.all([
      vectorStore.delete({
        namespace: organizationId,
        sourceId: payload.sourceId,
      }),

      payload.destroy &&
        _file &&
        storage.delete({ bucket: env.S3_ENGINE_BUCKET, key: _file.filePath }),

      payload.destroy &&
        source.type === 'database' &&
        storage.deleteDirectory({
          bucket: env.S3_ENGINE_BUCKET,
          path: `/sources/${payload.sourceId}/`,
        }),
    ])

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
    if (output.status === 'completed' && !payload.destroy) {
      await db
        .update(sourceOperations)
        .set({
          status: 'completed',
        })
        .where(eq(sourceOperations.sourceId, payload.sourceId))
    }
  },
})
