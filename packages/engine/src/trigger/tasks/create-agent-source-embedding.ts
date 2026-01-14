import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { and, eq, notInArray } from '@workspace/db/orm'
import {
  agents,
  agentsToSources,
  databaseSources,
  fileSources,
  files,
  questionAnswerSources,
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

export type CreateAgentSourceEmbeddingTask =
  typeof createAgentSourceEmbeddingTask

export const createAgentSourceEmbeddingTask = schemaTask({
  id: 'create-agent-source-embedding',
  schema: z.object({
    agentId: z.string(),
    sourceId: z.string(),
  }),
  run: async (payload) => {
    const [agentSourceEmbedding] = await db
      .select({
        agentId: agentsToSources.agentId,
        sourceId: agentsToSources.sourceId,
        status: agentsToSources.status,
        organizationId: agents.organizationId,
        agent: {
          id: agents.id,
          embeddingModelSettingsId: agents.embeddingModelSettingsId,
        },
        source: {
          id: sources.id,
          type: sources.type,
          chunkSize: sources.chunkSize,
          chunkOverlap: sources.chunkOverlap,
        },
      })
      .from(agentsToSources)
      .innerJoin(agents, eq(agentsToSources.agentId, agents.id))
      .innerJoin(sources, eq(agentsToSources.sourceId, sources.id))
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
          notInArray(agentsToSources.status, ['delete-queued', 'deleting']),
        ),
      )
      .limit(1)

    if (!agentSourceEmbedding) {
      throw new AbortTaskRunError('Agent source embedding not found')
    }

    const { agent, source, organizationId } = agentSourceEmbedding

    if (!organizationId) {
      throw new AbortTaskRunError('Organization not found')
    }

    const embeddingModelSettings = await resolveEmbeddingModelSettings({
      modelSettingsId: agent.embeddingModelSettingsId,
    })

    if (!embeddingModelSettings) {
      throw new AbortTaskRunError('Embedding model settings not found')
    }

    await db
      .update(agentsToSources)
      .set({
        status: 'processing',
      })
      .where(
        and(
          eq(agentsToSources.agentId, agent.id),
          eq(agentsToSources.sourceId, source.id),
        ),
      )

    switch (source.type) {
      case 'text':
        const [textSource] = await db
          .select()
          .from(textSources)
          .where(eq(textSources.sourceId, payload.sourceId))
          .limit(1)

        if (!textSource) {
          throw new AbortTaskRunError('Text source not found')
        }

        await ingestTextSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId,
          agentId: payload.agentId,
          sourceId: payload.sourceId,
        })

        break

      case 'question-answer':
        const [questionAnswerSource] = await db
          .select()
          .from(questionAnswerSources)
          .where(eq(questionAnswerSources.sourceId, payload.sourceId))
          .limit(1)

        if (!questionAnswerSource) {
          throw new AbortTaskRunError('Question answer source not found')
        }

        await ingestQuestionAnswerSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId,
          agentId: payload.agentId,
          sourceId: payload.sourceId,
        })
        break

      case 'website':
        const [websiteSource] = await db
          .select()
          .from(websiteSources)
          .where(eq(websiteSources.sourceId, payload.sourceId))
          .limit(1)

        if (!websiteSource) {
          throw new AbortTaskRunError('Website source not found')
        }

        await ingestWebsiteSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId,
          agentId: payload.agentId,
          sourceId: payload.sourceId,
        })
        break

      case 'file':
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
          organizationId,
          agentId: payload.agentId,
          sourceId: payload.sourceId,
          filePath: destinationPath,
          chunkSize: source.chunkSize,
          chunkOverlap: source.chunkOverlap,
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

        await ingestDatabaseSource({
          embeddingModel: embeddingModelSettings.model,
          organizationId,
          agentId: payload.agentId,
          sourceId: payload.sourceId,
          tablesMetadata: tablesMetadata || [],
        })

        // await ingestDatabaseSourceTablesMetadata({
        //   embeddingModel: embeddingModelSettings.model,
        //   organizationId,
        //   sourceId: payload.sourceId,
        //   tablesMetadata: tablesMetadata || [],
        // })

        // await ingestDatabaseSourceProperNouns({
        //   embeddingModel: embeddingModelSettings.model,
        //   organizationId,
        //   sourceId: payload.sourceId,
        // })

        // await ingestDatabaseSourceQueryExamples({
        //   embeddingModel: embeddingModelSettings.model,
        //   organizationId,
        //   sourceId: payload.sourceId,
        //   queryExamples: queryExamples || [],
        // })
        break

      default:
        throw new AbortTaskRunError('Source type not supported')
    }

    return {
      status: 'success',
      message: 'Agent source embedding created successfully',
    }
  },
  onFailure: async ({ payload }) => {
    await db
      .update(agentsToSources)
      .set({
        status: 'failed',
      })
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
        ),
      )
  },
  onSuccess: async ({ payload }) => {
    await db
      .update(agentsToSources)
      .set({
        status: 'completed',
      })
      .where(
        and(
          eq(agentsToSources.agentId, payload.agentId),
          eq(agentsToSources.sourceId, payload.sourceId),
        ),
      )
  },
})
