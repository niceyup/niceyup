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
import { resolveAgentSystemConfiguration } from '@workspace/engine/agents'
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

export async function getAgentSystemConfiguration(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/system-configuration',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get agent system configuration',
        operationId: 'getAgentSystemConfiguration',
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
                systemConfiguration: z
                  .object({
                    auxiliaryLanguageModelSettings:
                      modelSettingsSchema.nullable(),
                    titleGenerationSystemMessage: z.string(),
                    suggestions: z.array(z.string()),
                  })
                  .nullable(),
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

      const agentSystemConfiguration = await resolveAgentSystemConfiguration({
        agentId,
      })

      const auxiliaryLanguageModelSettings =
        await agentSystemConfiguration?.auxiliaryLanguageModelSettings()

      return {
        agent: {
          id: agent.id,
          systemConfiguration: agentSystemConfiguration
            ? {
                auxiliaryLanguageModelSettings:
                  auxiliaryLanguageModelSettings ?? null,
                titleGenerationSystemMessage:
                  agentSystemConfiguration.titleGenerationSystemMessage,
                suggestions: agentSystemConfiguration.suggestions,
              }
            : null,
        },
      }
    },
  )
}
