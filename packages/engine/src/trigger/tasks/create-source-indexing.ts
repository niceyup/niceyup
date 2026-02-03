import { schemaTask } from '@trigger.dev/sdk'
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
import { InvalidArgumentError } from '../../erros'
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
      throw new InvalidArgumentError({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
      })
    }

    if (!agent.organizationId) {
      throw new InvalidArgumentError({
        code: 'AGENT_ORGANIZATION_NOT_FOUND',
        message: 'Agent organization not found',
      })
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
      throw new InvalidArgumentError({
        code: 'SOURCE_NOT_FOUND',
        message: 'Source not found',
      })
    }

    if (source.status !== 'completed') {
      throw new InvalidArgumentError({
        code: 'SOURCE_NOT_COMPLETED',
        message: 'Source is not completed',
      })
    }

    const embeddingModel = await resolveEmbeddingModelSettings({
      modelSettingsId: agent.embeddingModelSettingsId,
    })

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
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
          throw new InvalidArgumentError({
            code: 'TEXT_SOURCE_NOT_FOUND',
            message: 'Text source not found',
          })
        }

        await ingestTextSource({
          embeddingModel: embeddingModel.model,
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
          throw new InvalidArgumentError({
            code: 'QUESTION_ANSWER_SOURCE_NOT_FOUND',
            message: 'Question answer source not found',
          })
        }

        await ingestQuestionAnswerSource({
          embeddingModel: embeddingModel.model,
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
          throw new InvalidArgumentError({
            code: 'WEBSITE_SOURCE_NOT_FOUND',
            message: 'Website source not found',
          })
        }

        await ingestWebsiteSource({
          embeddingModel: embeddingModel.model,
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
          throw new InvalidArgumentError({
            code: 'FILE_SOURCE_NOT_FOUND',
            message: 'File source not found',
          })
        }

        if (!fileSource.fileId) {
          throw new InvalidArgumentError({
            code: 'FILE_NOT_FOUND_FOR_FILE_SOURCE',
            message: 'File not found for file source',
          })
        }

        const [file] = await db
          .select()
          .from(files)
          .where(eq(files.id, fileSource.fileId))
          .limit(1)

        if (!file) {
          throw new InvalidArgumentError({
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          })
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
          embeddingModel: embeddingModel.model,
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
          throw new InvalidArgumentError({
            code: 'DATABASE_SOURCE_NOT_FOUND',
            message: 'Database source not found',
          })
        }

        const {
          tablesMetadata,
          // queryExamples
        } = databaseSource

        await ingestDatabaseSource({
          embeddingModel: embeddingModel.model,
          organizationId: agent.organizationId,
          agentId: sourceIndex.agentId,
          sourceId: sourceIndex.sourceId,
          tablesMetadata: tablesMetadata || [],
        })

        // await ingestDatabaseSourceTablesMetadata({
        //   embeddingModel: embeddingModel.model,
        //   organizationId: agent.organizationId,
        //   sourceId: sourceIndex.sourceId,
        //   tablesMetadata: tablesMetadata || [],
        // })

        // await ingestDatabaseSourceProperNouns({
        //   embeddingModel: embeddingModel.model,
        //   organizationId: agent.organizationId,
        //   sourceId: sourceIndex.sourceId,
        // })

        // await ingestDatabaseSourceQueryExamples({
        //   embeddingModel: embeddingModel.model,
        //   organizationId: agent.organizationId,
        //   sourceId: sourceIndex.sourceId,
        //   queryExamples: queryExamples || [],
        // })
        break

      default:
        throw new InvalidArgumentError({
          code: 'SOURCE_TYPE_NOT_SUPPORTED',
          message: 'Source type not supported',
        })
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
      .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))
  },
  onSuccess: async ({ payload, output }) => {
    if (output.status === 'completed') {
      await db
        .update(sourceOperations)
        .set({
          status: 'completed',
          error: null,
        })
        .where(eq(sourceOperations.sourceIndexId, payload.sourceIndexId))
    }
  },
})
