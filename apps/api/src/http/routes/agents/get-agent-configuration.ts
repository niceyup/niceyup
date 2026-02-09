import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { modelTypeSchema } from '@workspace/core/models'
import { providerSchema } from '@workspace/core/providers'
import { queries } from '@workspace/db/queries'
import { resolveAgentConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  id: z.string(),
  provider: providerSchema,
  model: z.string(),
  type: modelTypeSchema,
  options: z.record(z.string(), z.unknown()).nullish(),
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
                languageModelSettings: modelSettingsSchema.nullable(),
                embeddingModelSettings: modelSettingsSchema.nullable(),
                systemMessage: z.string().nullable(),
                promptMessages: z
                  .array(
                    z.object({
                      role: z.enum(['user', 'assistant']),
                      content: z.string(),
                    }),
                  )
                  .nullable(),
                suggestions: z.array(z.string()).nullable(),
                enableSourceRetrievalTool: z.boolean(),
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

      if (!agentConfiguration) {
        throw new BadRequestError({
          code: 'AGENT_CONFIGURATION_NOT_FOUND',
          message: 'Agent configuration not found',
        })
      }

      const [languageModelSettings, embeddingModelSettings] = await Promise.all(
        [
          agentConfiguration.languageModelSettings(),
          agentConfiguration.embeddingModelSettings(),
        ],
      )

      return {
        agent: {
          id: agent.id,
          languageModelSettings,
          embeddingModelSettings,
          systemMessage: agentConfiguration.systemMessage,
          promptMessages: agentConfiguration.promptMessages,
          suggestions: agentConfiguration.suggestions,
          enableSourceRetrievalTool:
            agentConfiguration.enableSourceRetrievalTool,
        },
      }
    },
  )
}
