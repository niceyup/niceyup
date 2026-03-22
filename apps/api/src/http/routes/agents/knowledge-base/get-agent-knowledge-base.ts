import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { knowledgeBaseStatusSchema } from '@workspace/core/knowledge-bases'
import {
  modelProviderSchema,
  modelProviderSettingsSchema,
} from '@workspace/core/model-providers'
import { modelTypeSchema } from '@workspace/core/models'
import { vectorStoreProviderSchema } from '@workspace/core/vector-stores'
import { queries } from '@workspace/db/queries'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { z } from 'zod'

const vectorStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: vectorStoreProviderSchema,
  settings: z.record(z.string(), z.unknown()).nullable(),
  credentials: z.record(z.string(), z.unknown()).nullable(),
})

const modelSettingsSchema = z.object({
  id: z.string(),
  model: z.string(),
  type: modelTypeSchema,
  options: z.record(z.string(), z.unknown()).nullable(),
  provider: z
    .object({
      id: z.string(),
      name: z.string(),
      provider: modelProviderSchema,
      settings: modelProviderSettingsSchema.nullable(),
    })
    .nullable(),
})

export async function getAgentKnowledgeBase(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/knowledge-base',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Get agent knowledge base',
        operationId: 'getAgentKnowledgeBase',
        params: z.object({
          agentId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              agent: z.object({
                id: z.string(),
                knowledgeBase: z
                  .object({
                    status: knowledgeBaseStatusSchema,
                    vectorStore: vectorStoreSchema.nullable(),
                    embeddingModelSettings: modelSettingsSchema.nullable(),
                    topK: z.number().nullable(),
                  })
                  .nullable(),
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { agentId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agent = await queries.context.getAgent(context, {
        agentId,
      })

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const agentKnowledgeBase = await resolveAgentKnowledgeBase({
        agentId,
      })

      const [vectorStore, embeddingModelSettings] = await Promise.all([
        agentKnowledgeBase?.vectorStore(),
        agentKnowledgeBase?.embeddingModelSettings(),
      ])

      return {
        agent: {
          id: agent.id,
          knowledgeBase: agentKnowledgeBase
            ? {
                status: agentKnowledgeBase.status,
                vectorStore: vectorStore ?? null,
                embeddingModelSettings: embeddingModelSettings ?? null,
                topK: agentKnowledgeBase.topK,
              }
            : null,
        },
      }
    },
  )
}
