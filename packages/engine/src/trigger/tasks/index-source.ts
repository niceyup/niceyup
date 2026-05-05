import { schemaTask } from '@trigger.dev/sdk'
import { InvalidArgumentError, NiceyupError } from '@workspace/core/errros'
import { db } from '@workspace/db'
import { eq, sql } from '@workspace/db/orm'
import {
  databaseSources,
  fileSources,
  files,
  indexedSources,
  knowledgeBases,
  questionAnswerSources,
  sourceOperations,
  sources,
  textSources,
  websiteSources,
} from '@workspace/db/schema'
import { storage } from '@workspace/storage'
import { z } from 'zod'
import { resolveEmbeddingModelSettings, resolveVectorStore } from '../../agents'
import { RetryableError } from '../../errors'
import {
  ingestDatabaseSource,
  ingestFileSource,
  ingestQuestionAnswerSource,
  ingestTextSource,
  ingestWebsiteSource,
} from '../../ingestors'
import { env } from '../../lib/env'
import { tmpDir } from '../../lib/utils'
import { indexedSourceQueue } from './queue'

export type IndexSourceTask = typeof indexSourceTask

export const indexSourceTask = schemaTask({
  id: 'index-source',
  queue: indexedSourceQueue,
  schema: z.object({
    indexedSourceId: z.string(),
    reindexing: z.boolean().optional(),
  }),
  run: async (payload) => {
    const [indexedSource] = await db
      .select({
        id: indexedSources.id,
        status: indexedSources.status,
        indexedAt: indexedSources.indexedAt,
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

    const isQueued =
      indexedSource?.operation?.type === 'index' &&
      indexedSource?.operation?.status === 'queued'

    if (!isQueued) {
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
        embeddingModelSettingsId: knowledgeBases.embeddingModelSettingsId,
        organizationId: knowledgeBases.organizationId,
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

    if (!payload.reindexing && knowledgeBase.status !== 'ready') {
      throw new InvalidArgumentError({
        code: 'KNOWLEDGE_BASE_NOT_READY',
        message: 'Knowledge base is not ready',
      })
    }

    if (payload.reindexing && knowledgeBase.status !== 'reindexing') {
      throw new InvalidArgumentError({
        code: 'KNOWLEDGE_BASE_NOT_REINDEXING',
        message: 'Knowledge base is not reindexing',
      })
    }

    const [source] = await db
      .select({
        id: sources.id,
        type: sources.type,
        status: sources.status,
        chunkSize: sources.chunkSize,
        chunkOverlap: sources.chunkOverlap,
        contentUpdatedAt: sources.contentUpdatedAt,
      })
      .from(sources)
      .where(eq(sources.id, indexedSource.sourceId))
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

    await db
      .update(sourceOperations)
      .set({
        status: 'processing',
        error: null,
      })
      .where(eq(sourceOperations.indexedSourceId, payload.indexedSourceId))

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

    const isStale = Boolean(
      source.contentUpdatedAt &&
        indexedSource.indexedAt &&
        indexedSource.indexedAt < source.contentUpdatedAt,
    )

    if (isStale) {
      await vectorStore.delete({
        sourceId: indexedSource.sourceId,
      })
    }

    switch (source.type) {
      case 'text':
        const [textSource] = await db
          .select()
          .from(textSources)
          .where(eq(textSources.sourceId, indexedSource.sourceId))
          .limit(1)

        if (!textSource) {
          throw new InvalidArgumentError({
            code: 'TEXT_SOURCE_NOT_FOUND',
            message: 'Text source not found',
          })
        }

        await ingestTextSource({
          vectorStore,
          sourceId: indexedSource.sourceId,
        })

        break

      case 'question-answer':
        const [questionAnswerSource] = await db
          .select()
          .from(questionAnswerSources)
          .where(eq(questionAnswerSources.sourceId, indexedSource.sourceId))
          .limit(1)

        if (!questionAnswerSource) {
          throw new InvalidArgumentError({
            code: 'QUESTION_ANSWER_SOURCE_NOT_FOUND',
            message: 'Question answer source not found',
          })
        }

        await ingestQuestionAnswerSource({
          vectorStore,
          sourceId: indexedSource.sourceId,
        })
        break

      case 'website':
        const [websiteSource] = await db
          .select()
          .from(websiteSources)
          .where(eq(websiteSources.sourceId, indexedSource.sourceId))
          .limit(1)

        if (!websiteSource) {
          throw new InvalidArgumentError({
            code: 'WEBSITE_SOURCE_NOT_FOUND',
            message: 'Website source not found',
          })
        }

        await ingestWebsiteSource({
          vectorStore,
          sourceId: indexedSource.sourceId,
        })
        break

      case 'file':
        const [fileSource] = await db
          .select()
          .from(fileSources)
          .where(eq(fileSources.sourceId, indexedSource.sourceId))
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
          vectorStore,
          sourceId: indexedSource.sourceId,
          filePath: destinationPath,
          chunkSize: source.chunkSize,
          chunkOverlap: source.chunkOverlap,
        })
        break

      case 'database':
        const [databaseSource] = await db
          .select()
          .from(databaseSources)
          .where(eq(databaseSources.sourceId, indexedSource.sourceId))
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
          vectorStore,
          sourceId: indexedSource.sourceId,
          tablesMetadata: tablesMetadata || [],
        })

        // await ingestDatabaseSourceTablesMetadata({
        //   vectorStore,
        //   sourceId: indexedSource.sourceId,
        //   tablesMetadata: tablesMetadata || [],
        // })

        // await ingestDatabaseSourceProperNouns({
        //   vectorStore,
        //   sourceId: indexedSource.sourceId,
        // })

        // await ingestDatabaseSourceQueryExamples({
        //   vectorStore,
        //   sourceId: indexedSource.sourceId,
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
      .update(indexedSources)
      .set({
        status: 'completed',
        indexedAt: new Date(),
      })
      .where(eq(indexedSources.id, payload.indexedSourceId))

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
        .update(sourceOperations)
        .set({
          status: 'completed',
          error: null,
        })
        .where(eq(sourceOperations.indexedSourceId, payload.indexedSourceId))
    }
  },
})
