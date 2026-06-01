import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentConfigurations, modelSettings } from '@workspace/db/schema'
import { resolveConversationConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  providerId: z.string(),
  model: z.string().nonempty(),
  options: z.record(z.string(), z.unknown()).nullish(),
})

const promptMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export async function updateConversationConfiguration(
  app: FastifyTypedInstance,
) {
  app.register(authenticate).patch(
    '/conversations/:conversationId/configuration',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Update a conversation configuration',
        operationId: 'updateConversationConfiguration',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          agentId: z.string(),
          languageModelSettings: modelSettingsSchema.nullish(),
          systemMessage: z.string().nullish(),
          promptMessages: z.array(promptMessageSchema).nullish(),
          enableKnowledgeBaseTool: z.boolean().nullish(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { conversationId } = request.params

      const {
        agentId,
        languageModelSettings,
        systemMessage,
        promptMessages,
        enableKnowledgeBaseTool,
      } = request.body

      const conversation = await queries.ctx.getConversation(
        { userId: user.id, organizationId: organization.id },
        { agentId, conversationId },
      )

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

      if (languageModelSettings) {
        const modelProvider = await queries.ctx.getModelProvider(
          { organizationId: organization.id },
          { modelProviderId: languageModelSettings.providerId },
        )

        if (!modelProvider) {
          throw new BadRequestError({
            code: 'LANGUAGE_MODEL_PROVIDER_NOT_FOUND',
            message:
              'Language model provider not found or you don’t have access',
          })
        }
      }

      await db.transaction(async (tx) => {
        let _languageModelSettingsId: string | null | undefined = undefined

        if (
          // Delete language model settings
          languageModelSettings === null &&
          conversationConfiguration.languageModelSettingsId
        ) {
          await tx
            .delete(modelSettings)
            .where(
              eq(
                modelSettings.id,
                conversationConfiguration.languageModelSettingsId,
              ),
            )

          _languageModelSettingsId = null
        } else if (
          // Update language model settings
          languageModelSettings &&
          conversationConfiguration.languageModelSettingsId
        ) {
          await tx
            .update(modelSettings)
            .set({
              model: languageModelSettings.model,
              options: languageModelSettings.options,
              providerId: languageModelSettings.providerId,
            })
            .where(
              eq(
                modelSettings.id,
                conversationConfiguration.languageModelSettingsId,
              ),
            )

          _languageModelSettingsId =
            conversationConfiguration.languageModelSettingsId
        } else if (
          // Create language model settings
          languageModelSettings &&
          !conversationConfiguration.languageModelSettingsId
        ) {
          const [createdLanguageModelSettings] = await tx
            .insert(modelSettings)
            .values({
              model: languageModelSettings.model,
              type: 'language-model',
              options: languageModelSettings.options,
              providerId: languageModelSettings.providerId,
              organizationId: organization.id,
            })
            .returning({
              id: modelSettings.id,
            })

          if (!createdLanguageModelSettings) {
            throw new BadRequestError({
              code: 'LANGUAGE_MODEL_SETTINGS_NOT_CREATED',
              message: 'Language model settings not created',
            })
          }

          _languageModelSettingsId = createdLanguageModelSettings.id
        }

        await tx
          .update(agentConfigurations)
          .set({
            languageModelSettingsId: _languageModelSettingsId,
            systemMessage,
            promptMessages,
            enableKnowledgeBaseTool,
          })
          .where(eq(agentConfigurations.conversationId, conversationId))
      })

      return reply.status(204).send()
    },
  )
}
