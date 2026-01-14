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
                languageModeSettings: modelSettingsSchema.nullish(),
                embeddingModelSettings: modelSettingsSchema.nullish(),
                systemMessage: z.string().nullish(),
                promptMessages: z
                  .array(
                    z.object({
                      role: z.enum(['user', 'assistant']),
                      content: z.string(),
                    }),
                  )
                  .nullish(),
                suggestions: z.array(z.string()).nullish(),
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

      const agentConfig = await resolveAgentConfiguration({
        agentId,
      })

      return {
        agent: {
          id: agent.id,
          languageModelSettings: agentConfig.languageModel?.settings,
          embeddingModelSettings: agentConfig.embeddingModel?.settings,
          systemMessage: agentConfig.systemMessage,
          promptMessages: agentConfig.promptMessages,
          suggestions: agentConfig.suggestions,
        },
      }
    },
  )
}
