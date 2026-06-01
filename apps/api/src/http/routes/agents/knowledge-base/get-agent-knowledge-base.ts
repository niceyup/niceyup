import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              agent: z.object({
                id: z.string(),
                knowledgeBase: z.object({
                  status: knowledgeBaseStatusSchema,
                  vectorStore: vectorStoreSchema.nullable(),
                  embeddingModelSettings: modelSettingsSchema.nullable(),
                  topK: z.number().nullable(),
                }),
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { agentId } = request.params

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

      if (!agentKnowledgeBase) {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_FOUND',
          message: 'Knowledge base not found',
        })
      }

      const [vectorStore, embeddingModelSettings] = await Promise.all([
        agentKnowledgeBase.vectorStore(),
        agentKnowledgeBase.embeddingModelSettings(),
      ])

      return {
        agent: {
          id: agent.id,
          knowledgeBase: {
            status: agentKnowledgeBase.status,
            vectorStore: vectorStore ?? null,
            embeddingModelSettings: embeddingModelSettings ?? null,
            topK: agentKnowledgeBase.topK,
          },
        },
      }
    },
  )
}
