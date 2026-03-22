import { getAgent } from '@/actions/agents'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/alert'
import { InfoIcon } from 'lucide-react'
import { EditEmbeddingModelSettingsForm } from './_components/edit-embedding-model-settings'
import { EditEnableKnowledgeBaseToolForm } from './_components/edit-enable-knowledge-base-tool'
import { EditTopKForm } from './_components/edit-top-k'
import { EditVectorStoreForm } from './_components/edit-vector-store'
import { ReindexKnowledgeBaseForm } from './_components/reindex-knowledge-base-form'

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
        knowledgeBase: true,
      },
    },
  )

  if (!agent) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {agent.knowledgeBase?.status === 'reindexing' && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Reindexing Knowledge Base</AlertTitle>
          <AlertDescription>
            The knowledge base is currently being reindexed. Some settings are
            temporarily disabled until the process is complete.
          </AlertDescription>
        </Alert>
      )}

      <EditEnableKnowledgeBaseToolForm
        params={{ organizationSlug, agentId }}
        enableKnowledgeBaseTool={agent.configuration?.enableKnowledgeBaseTool}
      />

      <EditVectorStoreForm
        params={{ organizationSlug, agentId }}
        vectorStore={
          agent.knowledgeBase?.vectorStore
            ? {
                id: agent.knowledgeBase.vectorStore.id,
                value: agent.knowledgeBase.vectorStore,
              }
            : null
        }
      />

      <EditEmbeddingModelSettingsForm
        params={{ organizationSlug, agentId }}
        embeddingModelSettings={
          agent.knowledgeBase?.embeddingModelSettings
            ? {
                ...agent.knowledgeBase.embeddingModelSettings,
                provider: agent.knowledgeBase.embeddingModelSettings.provider
                  ? {
                      id: agent.knowledgeBase.embeddingModelSettings.provider
                        .id,
                      value:
                        agent.knowledgeBase.embeddingModelSettings.provider,
                    }
                  : null,
              }
            : null
        }
      />

      <EditTopKForm
        params={{ organizationSlug, agentId }}
        topK={agent.knowledgeBase?.topK}
      />

      <ReindexKnowledgeBaseForm
        params={{ organizationSlug, agentId }}
        disabled={
          !agent.knowledgeBase?.isConfigured ||
          agent.knowledgeBase?.status === 'reindexing'
        }
      />
    </div>
  )
}
