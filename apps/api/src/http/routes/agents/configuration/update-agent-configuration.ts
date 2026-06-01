import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentConfigurations, modelSettings } from '@workspace/db/schema'
import { resolveAgentConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  providerId: z.string().nullish(),
  model: z.string().nonempty(),
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { agentId } = request.params

      const {
        languageModelSettings,
        systemMessage,
        promptMessages,
        enableKnowledgeBaseTool,
      } = request.body

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

      const agentConfiguration = await resolveAgentConfiguration({
        agentId,
      })

      if (!agentConfiguration) {
        throw new BadRequestError({
          code: 'AGENT_CONFIGURATION_NOT_FOUND',
          message: 'Agent configuration not found',
        })
      }

      if (languageModelSettings?.providerId) {
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
          agentConfiguration.languageModelSettingsId
        ) {
          await tx
            .delete(modelSettings)
            .where(
              eq(modelSettings.id, agentConfiguration.languageModelSettingsId),
            )

          _languageModelSettingsId = null
        } else if (
          // Update language model settings
          languageModelSettings &&
          agentConfiguration.languageModelSettingsId
        ) {
          await tx
            .update(modelSettings)
            .set({
              model: languageModelSettings.model,
              options: languageModelSettings.options,
              providerId: languageModelSettings.providerId,
            })
            .where(
              eq(modelSettings.id, agentConfiguration.languageModelSettingsId),
            )

          _languageModelSettingsId = agentConfiguration.languageModelSettingsId
        } else if (
          // Create language model settings
          languageModelSettings &&
          !agentConfiguration.languageModelSettingsId
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
          .where(eq(agentConfigurations.agentId, agentId))
      })

      return reply.status(204).send()
    },
  )
}
