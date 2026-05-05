import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { and, eq, or } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  indexedSources,
  knowledgeBases,
  modelSettings,
  sourceOperations,
} from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  providerId: z.string().nullish(),
  model: z.string().nonempty(),
  options: z.record(z.string(), z.unknown()).nullish(),
})

export async function updateAgentKnowledgeBase(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/agents/:agentId/knowledge-base',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Update an agent knowledge base',
        operationId: 'updateAgentKnowledgeBase',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          vectorStoreId: z.string().nullish(),
          embeddingModelSettings: modelSettingsSchema.nullish(),
          topK: z.number().positive().nullish(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { agentId } = request.params

      const { vectorStoreId, embeddingModelSettings, topK } = request.body

      const agent = await queries.ctx.getAgent(
        { organizationId: organization.id },
        { agentId },
      )

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const agentKnowledgeBase = await resolveAgentKnowledgeBase({
        agentId,
      })

      if (agentKnowledgeBase?.status === 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_REINDEXING',
          message: 'Knowledge base is reindexing',
        })
      }

      if (
        agentKnowledgeBase &&
        (vectorStoreId !== undefined || embeddingModelSettings !== undefined)
      ) {
        const [indexingSource] = await db
          .select({ id: indexedSources.id })
          .from(indexedSources)
          .innerJoin(
            sourceOperations,
            eq(indexedSources.id, sourceOperations.indexedSourceId),
          )
          .where(
            and(
              eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id),
              or(
                eq(sourceOperations.status, 'queued'),
                eq(sourceOperations.status, 'processing'),
              ),
            ),
          )
          .limit(1)

        if (indexingSource) {
          throw new BadRequestError({
            code: 'KNOWLEDGE_BASE_INDEXING',
            message: 'Knowledge base is indexing',
          })
        }
      }

      if (vectorStoreId) {
        const vectorStore = await queries.ctx.getVectorStore(
          { organizationId: organization.id },
          { vectorStoreId },
        )

        if (!vectorStore) {
          throw new BadRequestError({
            code: 'VECTOR_STORE_NOT_FOUND',
            message: 'Vector store not found or you don’t have access',
          })
        }
      }

      if (embeddingModelSettings?.providerId) {
        const modelProvider = await queries.ctx.getModelProvider(
          { organizationId: organization.id },
          { modelProviderId: embeddingModelSettings.providerId },
        )

        if (!modelProvider) {
          throw new BadRequestError({
            code: 'EMBEDDING_MODEL_PROVIDER_NOT_FOUND',
            message:
              'Embedding model provider not found or you don’t have access',
          })
        }
      }

      await db.transaction(async (tx) => {
        let _agentKnowledgeBase:
          | {
              embeddingModelSettingsId: string | null
            }
          | undefined

        if (agentKnowledgeBase) {
          _agentKnowledgeBase = {
            embeddingModelSettingsId:
              agentKnowledgeBase.embeddingModelSettingsId,
          }
        } else {
          const [createdKnowledgeBase] = await tx
            .insert(knowledgeBases)
            .values({
              agentId,
              organizationId: organization.id,
            })
            .returning({
              embeddingModelSettingsId: knowledgeBases.embeddingModelSettingsId,
            })

          _agentKnowledgeBase = createdKnowledgeBase
        }

        if (!_agentKnowledgeBase) {
          throw new BadRequestError({
            code: 'KNOWLEDGE_BASE_NOT_FOUND',
            message: 'Knowledge base not found',
          })
        }

        let _embeddingModelSettingsId: string | null | undefined = undefined

        if (
          // Delete embedding model settings
          embeddingModelSettings === null &&
          _agentKnowledgeBase.embeddingModelSettingsId
        ) {
          await tx
            .delete(modelSettings)
            .where(
              eq(
                modelSettings.id,
                _agentKnowledgeBase.embeddingModelSettingsId,
              ),
            )

          _embeddingModelSettingsId = null
        } else if (
          // Update embedding model settings
          embeddingModelSettings &&
          _agentKnowledgeBase.embeddingModelSettingsId
        ) {
          await tx
            .update(modelSettings)
            .set({
              model: embeddingModelSettings.model,
              options: embeddingModelSettings.options,
              providerId: embeddingModelSettings.providerId,
            })
            .where(
              eq(
                modelSettings.id,
                _agentKnowledgeBase.embeddingModelSettingsId,
              ),
            )

          _embeddingModelSettingsId =
            _agentKnowledgeBase.embeddingModelSettingsId
        } else if (
          // Create embedding model settings
          embeddingModelSettings &&
          !_agentKnowledgeBase.embeddingModelSettingsId
        ) {
          const [createdEmbeddingModelSettings] = await tx
            .insert(modelSettings)
            .values({
              model: embeddingModelSettings.model,
              type: 'embedding-model',
              options: embeddingModelSettings.options,
              providerId: embeddingModelSettings.providerId,
              organizationId: organization.id,
            })
            .returning({
              id: modelSettings.id,
            })

          if (!createdEmbeddingModelSettings) {
            throw new BadRequestError({
              code: 'EMBEDDING_MODEL_SETTINGS_NOT_CREATED',
              message: 'Embedding model settings not created',
            })
          }

          _embeddingModelSettingsId = createdEmbeddingModelSettings.id
        }

        await tx
          .update(knowledgeBases)
          .set({
            vectorStoreId,
            embeddingModelSettingsId: _embeddingModelSettingsId,
            topK,
          })
          .where(eq(knowledgeBases.agentId, agentId))
      })

      return reply.status(204).send()
    },
  )
}
