import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentSystemConfigurations, modelSettings } from '@workspace/db/schema'
import { resolveAgentSystemConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

const modelSettingsSchema = z.object({
  providerId: z.string().nullish(),
  model: z.string().nonempty(),
  options: z.record(z.string(), z.unknown()).nullish(),
})

export async function updateAgentSystemConfiguration(
  app: FastifyTypedInstance,
) {
  app.register(authenticate).patch(
    '/agents/:agentId/system-configuration',
    {
      schema: {
        tags: ['Agents'],
        description: 'Update an agent system configuration',
        operationId: 'updateAgentSystemConfiguration',
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          auxiliaryLanguageModelSettings: modelSettingsSchema.nullish(),
          titleGenerationSystemMessage: z.string().nullish(),
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
        auxiliaryLanguageModelSettings,
        titleGenerationSystemMessage,
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

      const agentSystemConfiguration = await resolveAgentSystemConfiguration({
        agentId,
      })

      if (auxiliaryLanguageModelSettings?.providerId) {
        const modelProvider = await queries.context.getModelProvider(context, {
          modelProviderId: auxiliaryLanguageModelSettings.providerId,
        })

        if (!modelProvider) {
          throw new BadRequestError({
            code: 'AUXILIARY_LANGUAGE_MODEL_PROVIDER_NOT_FOUND',
            message:
              'Auxiliary language model provider not found or you don’t have access',
          })
        }
      }

      await db.transaction(async (tx) => {
        let _agentSystemConfiguration:
          | {
              auxiliaryLanguageModelSettingsId: string | null
            }
          | undefined

        if (agentSystemConfiguration) {
          _agentSystemConfiguration = {
            auxiliaryLanguageModelSettingsId:
              agentSystemConfiguration.auxiliaryLanguageModelSettingsId,
          }
        } else {
          const [createdAgentSystemConfiguration] = await tx
            .insert(agentSystemConfigurations)
            .values({
              agentId,
            })
            .returning({
              auxiliaryLanguageModelSettingsId:
                agentSystemConfigurations.auxiliaryLanguageModelSettingsId,
            })

          _agentSystemConfiguration = createdAgentSystemConfiguration
        }

        if (!_agentSystemConfiguration) {
          throw new BadRequestError({
            code: 'AGENT_SYSTEM_CONFIGURATION_NOT_FOUND',
            message: 'Agent system configuration not found',
          })
        }

        let _auxiliaryLanguageModelSettingsId: string | null | undefined =
          undefined

        if (
          // Delete auxiliary language model settings
          auxiliaryLanguageModelSettings === null &&
          _agentSystemConfiguration.auxiliaryLanguageModelSettingsId
        ) {
          await tx
            .delete(modelSettings)
            .where(
              eq(
                modelSettings.id,
                _agentSystemConfiguration.auxiliaryLanguageModelSettingsId,
              ),
            )

          _auxiliaryLanguageModelSettingsId = null
        } else if (
          // Update auxiliary language model settings
          auxiliaryLanguageModelSettings &&
          _agentSystemConfiguration.auxiliaryLanguageModelSettingsId
        ) {
          await tx
            .update(modelSettings)
            .set({
              model: auxiliaryLanguageModelSettings.model,
              options: auxiliaryLanguageModelSettings.options,
              providerId: auxiliaryLanguageModelSettings.providerId,
            })
            .where(
              eq(
                modelSettings.id,
                _agentSystemConfiguration.auxiliaryLanguageModelSettingsId,
              ),
            )

          _auxiliaryLanguageModelSettingsId =
            _agentSystemConfiguration.auxiliaryLanguageModelSettingsId
        } else if (
          // Create auxiliary language model settings
          auxiliaryLanguageModelSettings &&
          !_agentSystemConfiguration.auxiliaryLanguageModelSettingsId
        ) {
          const [createdAuxiliaryLanguageModelSettings] = await tx
            .insert(modelSettings)
            .values({
              model: auxiliaryLanguageModelSettings.model,
              type: 'language-model',
              options: auxiliaryLanguageModelSettings.options,
              providerId: auxiliaryLanguageModelSettings.providerId,
              organizationId: context.organizationId,
            })
            .returning({
              id: modelSettings.id,
            })

          if (!createdAuxiliaryLanguageModelSettings) {
            throw new BadRequestError({
              code: 'AUXILIARY_LANGUAGE_MODEL_SETTINGS_NOT_CREATED',
              message: 'Auxiliary language model settings not created',
            })
          }

          _auxiliaryLanguageModelSettingsId =
            createdAuxiliaryLanguageModelSettings.id
        }

        await tx
          .update(agentSystemConfigurations)
          .set({
            auxiliaryLanguageModelSettingsId: _auxiliaryLanguageModelSettingsId,
            titleGenerationSystemMessage,
            suggestions,
          })
          .where(eq(agentSystemConfigurations.agentId, agentId))
      })

      return reply.status(204).send()
    },
  )
}
