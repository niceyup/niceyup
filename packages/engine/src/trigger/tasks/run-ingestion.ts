import { AbortTaskRunError, logger, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import {
  databaseSources,
  fileSources,
  files,
  questionAnswerSources,
  sources,
  textSources,
  websiteSources,
} from '@workspace/db/schema'
import { z } from 'zod'
import {
  ingestDatabaseSource,
  ingestFileSource,
  ingestQuestionAnswerSource,
  ingestTextSource,
  ingestWebsiteSource,
} from '../../ingestors'

export const runIngestionTask = schemaTask({
  id: 'run-ingestion',
  schema: z.object({
    sourceId: z.string(),
  }),
  run: async (payload) => {
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, payload.sourceId))
      .limit(1)

    if (!source) {
      throw new AbortTaskRunError('Source not found')
    }

    const namespace = source.organizationId

    if (!namespace) {
      throw new AbortTaskRunError('Namespace not found')
    }

    switch (source.type) {
      case 'text':
        await logger.trace('Ingest Text Source', async () => {
          const [textSource] = await db
            .select()
            .from(textSources)
            .where(eq(textSources.sourceId, payload.sourceId))
            .limit(1)

          if (!textSource) {
            throw new AbortTaskRunError('Text source not found')
          }

          await logger.trace('Ingest Text Source', async () => {
            await ingestTextSource({
              namespace,
              sourceId: payload.sourceId,
            })
          })
        })
        break

      case 'question-answer':
        await logger.trace('Ingest Question Answer Source', async () => {
          const [questionAnswerSource] = await db
            .select()
            .from(questionAnswerSources)
            .where(eq(questionAnswerSources.sourceId, payload.sourceId))
            .limit(1)

          if (!questionAnswerSource) {
            throw new AbortTaskRunError('Question answer source not found')
          }

          await logger.trace('Ingest Question Answer Source', async () => {
            await ingestQuestionAnswerSource({
              namespace,
              sourceId: payload.sourceId,
            })
          })
        })
        break

      case 'website':
        await logger.trace('Ingest Website Source', async () => {
          const [websiteSource] = await db
            .select()
            .from(websiteSources)
            .where(eq(websiteSources.sourceId, payload.sourceId))
            .limit(1)

          if (!websiteSource) {
            throw new AbortTaskRunError('Website source not found')
          }

          await logger.trace('Ingest Website Source', async () => {
            await ingestWebsiteSource({
              namespace,
              sourceId: payload.sourceId,
            })
          })
        })
        break

      case 'file':
        await logger.trace('Ingest File Source', async () => {
          const [fileSource] = await db
            .select()
            .from(fileSources)
            .where(eq(fileSources.sourceId, payload.sourceId))
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

          await logger.trace('Ingest File Source', async () => {
            await ingestFileSource({
              namespace,
              sourceId: payload.sourceId,
              filePath: file.filePath,
              chunkSize: source.chunkSize,
              chunkOverlap: source.chunkOverlap,
            })
          })
        })
        break

      case 'database':
        const [databaseSource] = await db
          .select()
          .from(databaseSources)
          .where(eq(databaseSources.sourceId, payload.sourceId))
          .limit(1)

        if (!databaseSource) {
          throw new AbortTaskRunError('Database source not found')
        }

        const {
          tablesMetadata,
          // queryExamples
        } = databaseSource

        await logger.trace('Ingest Database Source', async () => {
          await ingestDatabaseSource({
            namespace,
            sourceId: payload.sourceId,
            tablesMetadata: tablesMetadata || [],
          })
        })

        // await logger.trace(
        //   'Ingest Tables Metadata from Database Source',
        //   async () => {
        //     await ingestDatabaseSourceTablesMetadata({
        //       namespace,
        //       sourceId: payload.sourceId,
        //       tablesMetadata: tablesMetadata || [],
        //     })
        //   },
        // )

        // await logger.trace(
        //   'Ingest Proper Nouns from Database Source',
        //   async () => {
        //     await ingestDatabaseSourceProperNouns({
        //       namespace,
        //       sourceId: payload.sourceId,
        //     })
        //   },
        // )

        // await logger.trace(
        //   'Ingest Query Examples from Database Source',
        //   async () => {
        //     await ingestDatabaseSourceQueryExamples({
        //       namespace,
        //       sourceId: payload.sourceId,
        //       queryExamples: queryExamples || [],
        //     })
        //   },
        // )
        break

      default:
        throw new AbortTaskRunError('Source type not supported')
    }

    return {
      status: 'success',
      message: 'Ingestion ran successfully',
    }
  },
})
