import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { getAgentConfiguration as getAgentConfigurationFn } from '@workspace/engine/agents'
import { providerAppSchema } from '@workspace/engine/providers'
import { z } from 'zod'

const modelSchema = z.object({
  id: z.string(),
  type: z.enum(['language_model', 'embedding_model']),
  model: z.string(),
  options: z.record(z.string(), z.unknown()).nullish(),
  provider: z
    .object({
      id: z.string(),
      app: providerAppSchema,
      payload: z.record(z.string(), z.unknown()).nullish(),
    })
    .nullish(),
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
                languageModel: modelSchema.nullish(),
                embeddingModel: modelSchema.nullish(),
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

      const { context } = await getMembershipContext({
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

      const agentConfiguration = await getAgentConfigurationFn({
        agentId,
      })

      return {
        agent: {
          id: agent.id,
          languageModel: agentConfiguration.languageModel?._model,
          embeddingModel: agentConfiguration.embeddingModel?._model,
          systemMessage: agentConfiguration.systemMessage,
          promptMessages: agentConfiguration.promptMessages,
          suggestions: agentConfiguration.suggestions,
        },
      }
    },
  )
}
