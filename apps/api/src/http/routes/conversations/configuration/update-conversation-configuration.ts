import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
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
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId } = request.params

      const {
        organizationId,
        organizationSlug,
        agentId,
        languageModelSettings,
        systemMessage,
        promptMessages,
        enableKnowledgeBaseTool,
      } = request.body

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

      if (languageModelSettings) {
        const modelProvider = await queries.context.getModelProvider(context, {
          modelProviderId: languageModelSettings.providerId,
        })

        if (!modelProvider) {
          throw new BadRequestError({
            code: 'LANGUAGE_MODEL_PROVIDER_NOT_FOUND',
            message:
              'Language model provider not found or you don’t have access',
          })
        }
      }

      await db.transaction(async (tx) => {
        let _conversationConfiguration:
          | {
              languageModelSettingsId: string | null
            }
          | undefined

        if (conversationConfiguration) {
          _conversationConfiguration = {
            languageModelSettingsId:
              conversationConfiguration.languageModelSettingsId,
          }
        } else {
          const [createdConversationConfiguration] = await tx
            .insert(agentConfigurations)
            .values({
              conversationId,
            })
            .returning({
              languageModelSettingsId:
                agentConfigurations.languageModelSettingsId,
            })

          _conversationConfiguration = createdConversationConfiguration
        }

        if (!_conversationConfiguration) {
          throw new BadRequestError({
            code: 'CONVERSATION_CONFIGURATION_NOT_FOUND',
            message: 'Conversation configuration not found',
          })
        }

        let _languageModelSettingsId: string | null | undefined = undefined

        if (
          // Delete language model settings
          languageModelSettings === null &&
          _conversationConfiguration.languageModelSettingsId
        ) {
          await tx
            .delete(modelSettings)
            .where(
              eq(
                modelSettings.id,
                _conversationConfiguration.languageModelSettingsId,
              ),
            )

          _languageModelSettingsId = null
        } else if (
          // Update language model settings
          languageModelSettings &&
          _conversationConfiguration.languageModelSettingsId
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
                _conversationConfiguration.languageModelSettingsId,
              ),
            )

          _languageModelSettingsId =
            _conversationConfiguration.languageModelSettingsId
        } else if (
          // Create language model settings
          languageModelSettings &&
          !_conversationConfiguration.languageModelSettingsId
        ) {
          const [createdLanguageModelSettings] = await tx
            .insert(modelSettings)
            .values({
              model: languageModelSettings.model,
              type: 'language-model',
              options: languageModelSettings.options,
              providerId: languageModelSettings.providerId,
              organizationId: context.organizationId,
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
