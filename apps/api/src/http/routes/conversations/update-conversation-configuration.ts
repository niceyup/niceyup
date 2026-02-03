import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { providerSchema } from '@workspace/core/providers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { conversations, modelSettings } from '@workspace/db/schema'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  provider: providerSchema,
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

      await db.transaction(async (tx) => {
        if (languageModelSettings !== undefined) {
          const [conversationConfiguration] = await tx
            .select({
              languageModelSettingsId: conversations.languageModelSettingsId,
            })
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1)

          if (languageModelSettings) {
            if (conversationConfiguration?.languageModelSettingsId) {
              await tx
                .update(modelSettings)
                .set({
                  provider: languageModelSettings.provider,
                  model: languageModelSettings.model,
                  options: languageModelSettings.options,
                })
                .where(
                  eq(
                    modelSettings.id,
                    conversationConfiguration.languageModelSettingsId,
                  ),
                )
            } else {
              const [createdLanguageModelSettings] = await tx
                .insert(modelSettings)
                .values({
                  provider: languageModelSettings.provider,
                  model: languageModelSettings.model,
                  type: 'language-model',
                  options: languageModelSettings.options,
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

              await tx
                .update(conversations)
                .set({
                  languageModelSettingsId: createdLanguageModelSettings.id,
                })
                .where(eq(conversations.id, conversationId))
            }
          } else if (languageModelSettings === null) {
            await tx
              .update(conversations)
              .set({
                languageModelSettingsId: null,
              })
              .where(eq(conversations.id, conversationId))
          }
        }

        if (systemMessage !== undefined || promptMessages !== undefined) {
          await tx
            .update(conversations)
            .set({
              systemMessage,
              promptMessages,
            })
            .where(eq(conversations.id, conversationId))
        }
      })

      return reply.status(204).send()
    },
  )
}
