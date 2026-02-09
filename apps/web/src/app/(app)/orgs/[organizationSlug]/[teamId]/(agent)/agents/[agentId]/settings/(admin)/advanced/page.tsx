import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { cacheTag } from 'next/cache'
import { EditEmbeddingModelSettingsForm } from './_components/edit-embedding-model-settings'
import { EditEnableSourceRetrievalToolForm } from './_components/edit-enable-source-retrieval-tool'
import { EditLanguageModelSettingsForm } from './_components/edit-language-model-settings'
import { EditPromptMessageForm } from './_components/edit-prompt-message'
import { EditSuggestionsForm } from './_components/edit-suggestion'
import { EditSystemMessageForm } from './_components/edit-system-message'

async function getAgentConfiguration(params: {
  organizationSlug: string
  agentId: string
}) {
  'use cache: private'
  cacheTag('update-agent-configuration')

  const { data } = await sdk.getAgentConfiguration({
    agentId: params.agentId,
    params: {
      organizationSlug: params.organizationSlug,
    },
  })

  return data?.agent || null
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, agentId } = await params

  const agentConfiguration = await getAgentConfiguration({
    organizationSlug,
    agentId,
  })

  if (!agentConfiguration) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditLanguageModelSettingsForm
        params={{ organizationSlug, agentId }}
        languageModelSettings={agentConfiguration.languageModelSettings}
      />

      <EditEnableSourceRetrievalToolForm
        params={{ organizationSlug, agentId }}
        enableSourceRetrievalTool={agentConfiguration.enableSourceRetrievalTool}
      />

      <EditEmbeddingModelSettingsForm
        params={{ organizationSlug, agentId }}
        embeddingModelSettings={agentConfiguration.embeddingModelSettings}
      />

      <EditSystemMessageForm
        params={{ organizationSlug, agentId }}
        systemMessage={agentConfiguration.systemMessage}
      />

      <EditPromptMessageForm
        params={{ organizationSlug, agentId }}
        promptMessages={agentConfiguration.promptMessages}
      />

      <EditSuggestionsForm
        params={{ organizationSlug, agentId }}
        suggestions={agentConfiguration.suggestions}
      />
    </div>
  )
}
