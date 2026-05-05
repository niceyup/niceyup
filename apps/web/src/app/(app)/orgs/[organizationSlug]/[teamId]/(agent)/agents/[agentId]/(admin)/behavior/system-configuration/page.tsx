import { getAgentDetailed } from '@/actions/agents'
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

  const agentDetailed = await getAgentDetailed(
    { organizationSlug, agentId },
    {
      with: {
        systemConfiguration: true,
      },
    },
  )

  if (!agentDetailed) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditAuxiliaryLanguageModelSettingsForm
        params={{ organizationSlug, agentId }}
        auxiliaryLanguageModelSettings={
          agentDetailed.systemConfiguration?.auxiliaryLanguageModelSettings
            ? {
                ...agentDetailed.systemConfiguration
                  .auxiliaryLanguageModelSettings,
                provider: agentDetailed.systemConfiguration
                  .auxiliaryLanguageModelSettings.provider
                  ? {
                      id: agentDetailed.systemConfiguration
                        .auxiliaryLanguageModelSettings.provider.id,
                      value:
                        agentDetailed.systemConfiguration
                          .auxiliaryLanguageModelSettings.provider,
                    }
                  : null,
              }
            : null
        }
      />

      <EditTitleGenerationSystemMessageForm
        params={{ organizationSlug, agentId }}
        titleGenerationSystemMessage={
          agentDetailed.systemConfiguration?.titleGenerationSystemMessage
        }
      />

      <EditSuggestionForm
        params={{ organizationSlug, agentId }}
        suggestions={agentDetailed.systemConfiguration?.suggestions}
      />
    </div>
  )
}
