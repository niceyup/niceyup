import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  modelProviderSchema,
  modelProviderSettingsSchema,
} from '@workspace/core/model-providers'
import { modelTypeSchema } from '@workspace/core/models'
import { queries } from '@workspace/db/queries'
import { resolveAgentConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

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

const promptMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export async function getAgentConfiguration(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/configuration',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get agent configuration',
        operationId: 'getAgentConfiguration',
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
                configuration: z
                  .object({
                    languageModelSettings: modelSettingsSchema.nullable(),
                    systemMessage: z.string(),
                    promptMessages: z.array(promptMessageSchema),
                    enableKnowledgeBaseTool: z.boolean(),
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

      const agentConfiguration = await resolveAgentConfiguration({
        agentId,
      })

      const languageModelSettings =
        await agentConfiguration?.languageModelSettings()

      return {
        agent: {
          id: agent.id,
          configuration: agentConfiguration
            ? {
                languageModelSettings: languageModelSettings ?? null,
                systemMessage: agentConfiguration.systemMessage,
                promptMessages: agentConfiguration.promptMessages,
                enableKnowledgeBaseTool:
                  agentConfiguration.enableKnowledgeBaseTool,
              }
            : null,
        },
      }
    },
  )
}
