import { AbortTaskRunError, logger, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import {
  fileSources,
  files,
  sourceExplorerNodes,
  sources,
} from '@workspace/db/schema'
import { z } from 'zod'
import { createAgentSourceEmbeddingTask } from '../create-agent-source-embedding'

export const runFilesLoaderAndIngestorTask = schemaTask({
  id: 'run-files-loader-and-ingestor',
  schema: z.object({
    organizationId: z.string(),
    agentId: z.string(),
    source: z.object({
      chunkSize: z.number(),
      chunkOverlap: z.number(),
    }),
  }),
  run: async (payload) => {
    const listFiles: {
      name: string
      mimeType: string
      size: number
      path: string
    }[] = []

    for (const file of listFiles) {
      const sourceId = await logger.trace('Create File Source', async () => {
        return await db.transaction(async (tx) => {
          const [createSource] = await tx
            .insert(sources)
            .values({
              name: '(Test) File Source',
              type: 'file',
              chunkSize: payload.source.chunkSize,
              chunkOverlap: payload.source.chunkOverlap,
              organizationId: payload.organizationId,
            })
            .returning()

          if (!createSource) {
            throw new AbortTaskRunError('Failed to create source')
          }

          const [createFile] = await tx
            .insert(files)
            .values({
              fileName: file.name,
              fileMimeType: file.mimeType,
              fileSize: file.size,
              filePath: file.path,
              bucket: 'engine',
              scope: 'sources',
              metadata: {
                sourceId: createSource.id,
              },
              organizationId: payload.organizationId,
            })
            .returning()

          if (!createFile) {
            throw new AbortTaskRunError('Failed to create file')
          }

          const [createFileSource] = await tx
            .insert(fileSources)
            .values({
              sourceId: createSource.id,
              fileId: createFile.id,
            })
            .returning()

          if (!createFileSource) {
            throw new AbortTaskRunError('Failed to create file source')
          }

          await tx.insert(sourceExplorerNodes).values({
            sourceId: createSource.id,
            organizationId: payload.organizationId,
          })

          return createSource.id
        })
      })

      await createAgentSourceEmbeddingTask.triggerAndWait({
        agentId: payload.agentId,
        sourceId,
      })
    }

    return {
      status: 'success',
      message: 'Document loaders ran successfully',
    }
  },
})
