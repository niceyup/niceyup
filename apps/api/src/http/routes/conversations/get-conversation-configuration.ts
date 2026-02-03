import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { modelTypeSchema } from '@workspace/core/models'
import { providerSchema } from '@workspace/core/providers'
import { queries } from '@workspace/db/queries'
import { resolveConversationConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  id: z.string(),
  provider: providerSchema,
  model: z.string(),
  type: modelTypeSchema,
  options: z.record(z.string(), z.unknown()).nullish(),
})

export async function getConversationConfiguration(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations/:conversationId/configuration',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Get conversation configuration',
        operationId: 'getConversationConfiguration',
        params: z.object({
          conversationId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              conversation: z.object({
                id: z.string(),
                languageModelSettings: modelSettingsSchema.nullable(),
                systemMessage: z.string().nullable(),
                promptMessages: z
                  .array(
                    z.object({
                      role: z.enum(['user', 'assistant']),
                      content: z.string(),
                    }),
                  )
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

      const { conversationId } = request.params

      const { organizationId, organizationSlug, agentId } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const conversation = await queries.context.getConversation(context, {
        agentId,
        conversationId,
      })

      if (!conversation) {
        throw new BadRequestError({
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found or you don’t have access',
        })
      }

      const conversationConfiguration = await resolveConversationConfiguration({
        conversationId,
      })

      if (!conversationConfiguration) {
        throw new BadRequestError({
          code: 'CONVERSATION_CONFIGURATION_NOT_FOUND',
          message: 'Conversation configuration not found',
        })
      }

      const languageModelSettings =
        await conversationConfiguration.languageModelSettings()

      return {
        conversation: {
          id: conversation.id,
          languageModelSettings,
          systemMessage: conversationConfiguration.systemMessage,
          promptMessages: conversationConfiguration.promptMessages,
        },
      }
    },
  )
}
