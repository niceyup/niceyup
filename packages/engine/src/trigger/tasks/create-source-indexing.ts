import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import {
  agents,
  databaseSources,
  fileSources,
  files,
  questionAnswerSources,
  sourceIndexes,
  sourceOperations,
  sources,
  textSources,
  websiteSources,
} from '@workspace/db/schema'
import { storage } from '@workspace/storage'
import { z } from 'zod'
import { resolveEmbeddingModelSettings } from '../../agents'
import {
  ingestDatabaseSource,
  ingestFileSource,
  ingestQuestionAnswerSource,
  ingestTextSource,
  ingestWebsiteSource,
} from '../../ingestors'
import { env } from '../../lib/env'
import { tmpDir } from '../../lib/utils'

export type CreateSourceIndexingTask = typeof createSourceIndexingTask

export const createSourceIndexingTask = schemaTask({
  id: 'create-source-indexing',
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
      sourceIndex?.operation?.type === 'index' &&
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
      throw new AbortTaskRunError('Agent not found')
    }

    if (!agent.organizationId) {
      throw new AbortTaskRunError('Agent organization not found')
    }

    const [source] = await db
      .select({
        id: sources.id,
        type: sources.type,
        status: sources.status,
        chunkSize: sources.chunkSize,
        chunkOverlap: sources.chunkOverlap,
      })
      .from(sources)
      .where(eq(sources.id, sourceIndex.sourceId))
      .limit(1)

    if (!source) {
      throw new AbortTaskRunError('Source not found')
    }

    if (source.status !== 'completed') {
      throw new AbortTaskRunError('Source is not completed')
    }

    const embeddingModelSettings = await resolveEmbeddingModelSettings({
      modelSettingsId: agent.embeddingModelSettingsId,
    })

    if (!embeddingModelSettings) {
      throw new AbortTaskRunError('Embedding model settings not found')
    }

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
      })
      .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))

    switch (source.type) {
      case 'text':
        const [textSource] = await db
          .select()
          .from(textSources)
          .where(eq(textSources.sourceId, sourceIndex.sourceId))
          .limit(1)

        if (!textSource) {
          throw new AbortTaskRunError('Text source not found')
        }

        await ingestTextSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId: agent.organizationId,
          agentId: sourceIndex.agentId,
          sourceId: sourceIndex.sourceId,
        })

        break

      case 'question-answer':
        const [questionAnswerSource] = await db
          .select()
          .from(questionAnswerSources)
          .where(eq(questionAnswerSources.sourceId, sourceIndex.sourceId))
          .limit(1)

        if (!questionAnswerSource) {
          throw new AbortTaskRunError('Question answer source not found')
        }

        await ingestQuestionAnswerSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId: agent.organizationId,
          agentId: sourceIndex.agentId,
          sourceId: sourceIndex.sourceId,
        })
        break

      case 'website':
        const [websiteSource] = await db
          .select()
          .from(websiteSources)
          .where(eq(websiteSources.sourceId, sourceIndex.sourceId))
          .limit(1)

        if (!websiteSource) {
          throw new AbortTaskRunError('Website source not found')
        }

        await ingestWebsiteSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId: agent.organizationId,
          agentId: sourceIndex.agentId,
          sourceId: sourceIndex.sourceId,
        })
        break

      case 'file':
        const [fileSource] = await db
          .select()
          .from(fileSources)
          .where(eq(fileSources.sourceId, sourceIndex.sourceId))
          .limit(1)

        if (!fileSource) {
          throw new AbortTaskRunError('File source not found')
        }

        if (!fileSource.fileId) {
          throw new AbortTaskRunError('File not found for file source')
        }

        const [file] = await db
          .select()
          .from(files)
          .where(eq(files.id, fileSource.fileId))
          .limit(1)

        if (!file) {
          throw new AbortTaskRunError('File not found')
        }

        const destinationPath = tmpDir(file.filePath)

        await storage.download({
          bucket:
            file.bucket === 'engine'
              ? env.S3_ENGINE_BUCKET
              : env.S3_DEFAULT_BUCKET,
          key: file.filePath,
          destinationPath,
        })

        await ingestFileSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId: agent.organizationId,
          agentId: sourceIndex.agentId,
          sourceId: sourceIndex.sourceId,
          filePath: destinationPath,
          chunkSize: source.chunkSize,
          chunkOverlap: source.chunkOverlap,
        })
        break

      case 'database':
        const [databaseSource] = await db
          .select()
          .from(databaseSources)
          .where(eq(databaseSources.sourceId, sourceIndex.sourceId))
          .limit(1)

        if (!databaseSource) {
          throw new AbortTaskRunError('Database source not found')
        }

        const {
          tablesMetadata,
          // queryExamples
        } = databaseSource

        await ingestDatabaseSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId: agent.organizationId,
          agentId: sourceIndex.agentId,
          sourceId: sourceIndex.sourceId,
          tablesMetadata: tablesMetadata || [],
        })

        // await ingestDatabaseSourceTablesMetadata({
        //   embeddingModel: embeddingModelSettings.model,
        //   organizationId: agent.organizationId,
        //   sourceId: sourceIndex.sourceId,
        //   tablesMetadata: tablesMetadata || [],
        // })

        // await ingestDatabaseSourceProperNouns({
        //   embeddingModel: embeddingModelSettings.model,
        //   organizationId: agent.organizationId,
        //   sourceId: sourceIndex.sourceId,
        // })

        // await ingestDatabaseSourceQueryExamples({
        //   embeddingModel: embeddingModelSettings.model,
        //   organizationId: agent.organizationId,
        //   sourceId: sourceIndex.sourceId,
        //   queryExamples: queryExamples || [],
        // })
        break

      default:
        throw new AbortTaskRunError('Source type not supported')
    }

    await db
      .update(sourceIndexes)
      .set({
        status: 'completed',
      })
      .where(eq(sourceIndexes.id, payload.sourceIndexId))

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
      .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))
  },
  onSuccess: async ({ payload, output }) => {
    if (output.status === 'completed') {
      await db
        .update(sourceOperations)
        .set({
          status: 'completed',
        })
        .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))
    }
  },
})
