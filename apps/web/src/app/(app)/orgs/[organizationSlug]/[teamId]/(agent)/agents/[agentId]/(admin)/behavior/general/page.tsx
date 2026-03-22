import { getAgent } from '@/actions/agents'
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

  const agent = await getAgent(
    { organizationSlug, agentId },
    {
      with: {
        configuration: true,
      },
    },
  )

  if (!agent) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditLanguageModelSettingsForm
        params={{ organizationSlug, agentId }}
        languageModelSettings={
          agent.configuration?.languageModelSettings
            ? {
                ...agent.configuration.languageModelSettings,
                provider: agent.configuration.languageModelSettings.provider
                  ? {
                      id: agent.configuration.languageModelSettings.provider.id,
                      value: agent.configuration.languageModelSettings.provider,
                    }
                  : null,
              }
            : null
        }
      />

      <EditSystemMessageForm
        params={{ organizationSlug, agentId }}
        systemMessage={agent.configuration?.systemMessage}
      />

      <EditPromptMessageForm
        params={{ organizationSlug, agentId }}
        promptMessages={agent.configuration?.promptMessages}
      />
    </div>
  )
}
