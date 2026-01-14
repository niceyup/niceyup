import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { providerSchema } from '@workspace/core/providers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agents, modelSettings } from '@workspace/db/schema'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  id: z.string(),
  provider: providerSchema,
  model: z.string(),
  options: z.record(z.string(), z.unknown()).nullish(),
})

const promptMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export async function updateAgentConfiguration(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/agents/:agentId/configuration',
    {
      schema: {
        tags: ['Agents'],
        description: 'Update an agent configuration',
        operationId: 'updateAgentConfiguration',
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          languageModelSettings: modelSettingsSchema.nullish(),
          embeddingModelSettings: modelSettingsSchema.nullish(),
          systemMessage: z.string().nullish(),
          promptMessages: z.array(promptMessageSchema).nullish(),
          suggestions: z.array(z.string()).nullish(),
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

      const { agentId } = request.params

      const {
        organizationId,
        organizationSlug,
        languageModelSettings,
        embeddingModelSettings,
        systemMessage,
        promptMessages,
        suggestions,
      } = request.body

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

      await db.transaction(async (tx) => {
        const [agentConfig] = await tx
          .select({
            languageModelSettingsId: agents.languageModelSettingsId,
            embeddingModelSettingsId: agents.embeddingModelSettingsId,
          })
          .from(agents)
          .where(eq(agents.id, agentId))
          .limit(1)

        if (languageModelSettings) {
          if (agentConfig?.languageModelSettingsId) {
            await tx
              .update(modelSettings)
              .set({
                provider: languageModelSettings.provider,
                model: languageModelSettings.model,
                options: languageModelSettings.options,
              })
              .where(eq(modelSettings.id, agentConfig.languageModelSettingsId))
          } else {
            const [createdLanguageModelSettings] = await tx
              .insert(modelSettings)
              .values({
                provider: languageModelSettings.provider,
                model: languageModelSettings.model,
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
              .update(agents)
              .set({
                languageModelSettingsId: createdLanguageModelSettings.id,
              })
              .where(eq(agents.id, agentId))
          }
        }

        if (embeddingModelSettings) {
          if (agentConfig?.embeddingModelSettingsId) {
            await tx
              .update(modelSettings)
              .set({
                provider: embeddingModelSettings.provider,
                model: embeddingModelSettings.model,
                options: embeddingModelSettings.options,
              })
              .where(eq(modelSettings.id, agentConfig.embeddingModelSettingsId))
          } else {
            const [createdEmbeddingModelSettings] = await tx
              .insert(modelSettings)
              .values({
                provider: embeddingModelSettings.provider,
                model: embeddingModelSettings.model,
                options: embeddingModelSettings.options,
              })
              .returning({
                id: modelSettings.id,
              })

            if (!createdEmbeddingModelSettings) {
              throw new BadRequestError({
                code: 'EMBEDDING_MODEL_SETTINGS_NOT_CREATED',
                message: 'Embedding model settings not created',
              })
            }

            await tx
              .update(agents)
              .set({
                embeddingModelSettingsId: createdEmbeddingModelSettings.id,
              })
              .where(eq(agents.id, agentId))
          }
        }

        await tx
          .update(agents)
          .set({
            systemMessage,
            promptMessages,
            suggestions,
          })
          .where(eq(agents.id, agentId))
      })

      return reply.status(204).send()
    },
  )
}
