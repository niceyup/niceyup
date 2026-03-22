import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentSystemConfigurations } from '@workspace/db/schema'
import { resolveLanguageModelSettings } from './resolve-model-settings'

export type AgentSystemConfiguration = Awaited<
  ReturnType<typeof resolveAgentSystemConfiguration>
>

export async function resolveAgentSystemConfiguration(params: {
  agentId: string
}) {
  const [agentSystemConfiguration] = await db
    .select({
      id: agentSystemConfigurations.id,
      auxiliaryLanguageModelSettingsId:
        agentSystemConfigurations.auxiliaryLanguageModelSettingsId,
      titleGenerationSystemMessage:
        agentSystemConfigurations.titleGenerationSystemMessage,
      suggestions: agentSystemConfigurations.suggestions,
    })
    .from(agentSystemConfigurations)
    .where(eq(agentSystemConfigurations.agentId, params.agentId))
    .limit(1)

  if (!agentSystemConfiguration) {
    return null
  }

  const auxiliaryLanguageModelSettingsId =
    agentSystemConfiguration.auxiliaryLanguageModelSettingsId ?? null

  const titleGenerationSystemMessage =
    agentSystemConfiguration.titleGenerationSystemMessage ?? ''

  const suggestions = agentSystemConfiguration.suggestions ?? []

  const auxiliaryLanguageModelSettings = async () => {
    if (!auxiliaryLanguageModelSettingsId) {
      return null
    }

    return await queries.getModelSettings({
      type: 'language-model',
      modelSettingsId: auxiliaryLanguageModelSettingsId,
    })
  }

  const auxiliaryLanguageModel = async () => {
    return await resolveLanguageModelSettings({
      modelSettingsId: auxiliaryLanguageModelSettingsId,
    })
  }

  return {
    auxiliaryLanguageModelSettingsId,
    titleGenerationSystemMessage,
    suggestions,
    auxiliaryLanguageModelSettings,
    auxiliaryLanguageModel,
  }
}
