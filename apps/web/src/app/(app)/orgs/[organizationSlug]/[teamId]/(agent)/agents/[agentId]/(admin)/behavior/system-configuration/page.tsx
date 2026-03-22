import { getAgent } from '@/actions/agents'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { EditAuxiliaryLanguageModelSettingsForm } from './_components/edit-auxiliary-language-model-settings'
import { EditSuggestionForm } from './_components/edit-suggestion'
import { EditTitleGenerationSystemMessageForm } from './_components/edit-title-generation-system-message'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, agentId } = await params

  const agent = await getAgent(
    { organizationSlug, agentId },
    {
      with: {
        systemConfiguration: true,
      },
    },
  )

  if (!agent) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditAuxiliaryLanguageModelSettingsForm
        params={{ organizationSlug, agentId }}
        auxiliaryLanguageModelSettings={
          agent.systemConfiguration?.auxiliaryLanguageModelSettings
            ? {
                ...agent.systemConfiguration.auxiliaryLanguageModelSettings,
                provider: agent.systemConfiguration
                  .auxiliaryLanguageModelSettings.provider
                  ? {
                      id: agent.systemConfiguration
                        .auxiliaryLanguageModelSettings.provider.id,
                      value:
                        agent.systemConfiguration.auxiliaryLanguageModelSettings
                          .provider,
                    }
                  : null,
              }
            : null
        }
      />

      <EditTitleGenerationSystemMessageForm
        params={{ organizationSlug, agentId }}
        titleGenerationSystemMessage={
          agent.systemConfiguration?.titleGenerationSystemMessage
        }
      />

      <EditSuggestionForm
        params={{ organizationSlug, agentId }}
        suggestions={agent.systemConfiguration?.suggestions}
      />
    </div>
  )
}
