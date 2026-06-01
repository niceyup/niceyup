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
  let [agentSystemConfiguration] = await db
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
    const agent = await queries.getAgent({
      agentId: params.agentId,
    })

    if (!agent) {
      return null
    }

    const [createdAgentSystemConfiguration] = await db
      .insert(agentSystemConfigurations)
      .values({
        agentId: agent.id,
      })
      .returning({
        id: agentSystemConfigurations.id,
        auxiliaryLanguageModelSettingsId:
          agentSystemConfigurations.auxiliaryLanguageModelSettingsId,
        titleGenerationSystemMessage:
          agentSystemConfigurations.titleGenerationSystemMessage,
        suggestions: agentSystemConfigurations.suggestions,
      })

    if (!createdAgentSystemConfiguration) {
      return null
    }

    agentSystemConfiguration = createdAgentSystemConfiguration
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
