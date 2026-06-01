import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
                configuration: z.object({
                  languageModelSettings: modelSettingsSchema.nullable(),
                  systemMessage: z.string(),
                  promptMessages: z.array(promptMessageSchema),
                  enableKnowledgeBaseTool: z.boolean(),
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

      const agentConfiguration = await resolveAgentConfiguration({
        agentId,
      })

      if (!agentConfiguration) {
        throw new BadRequestError({
          code: 'AGENT_CONFIGURATION_NOT_FOUND',
          message: 'Agent configuration not found',
        })
      }

      const languageModelSettings =
        await agentConfiguration.languageModelSettings()

      return {
        agent: {
          id: agent.id,
          configuration: {
            languageModelSettings: languageModelSettings ?? null,
            systemMessage: agentConfiguration.systemMessage,
            promptMessages: agentConfiguration.promptMessages,
            enableKnowledgeBaseTool: agentConfiguration.enableKnowledgeBaseTool,
          },
        },
      }
    },
  )
}
