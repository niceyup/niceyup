import { getAgentDetailed } from '@/actions/agents'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { EditLanguageModelSettingsForm } from './_components/edit-language-model-settings'
import { EditPromptMessageForm } from './_components/edit-prompt-message'
import { EditSystemMessageForm } from './_components/edit-system-message'

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
        configuration: true,
      },
    },
  )

  if (!agentDetailed) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditLanguageModelSettingsForm
        params={{ organizationSlug, agentId }}
        languageModelSettings={
          agentDetailed.configuration?.languageModelSettings
            ? {
                ...agentDetailed.configuration.languageModelSettings,
                provider: agentDetailed.configuration.languageModelSettings
                  .provider
                  ? {
                      id: agentDetailed.configuration.languageModelSettings
                        .provider.id,
                      value:
                        agentDetailed.configuration.languageModelSettings
                          .provider,
                    }
                  : null,
              }
            : null
        }
      />

      <EditSystemMessageForm
        params={{ organizationSlug, agentId }}
        systemMessage={agentDetailed.configuration?.systemMessage}
      />

      <EditPromptMessageForm
        params={{ organizationSlug, agentId }}
        promptMessages={agentDetailed.configuration?.promptMessages}
      />
    </div>
  )
}
