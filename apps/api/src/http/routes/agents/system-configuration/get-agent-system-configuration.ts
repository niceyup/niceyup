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
