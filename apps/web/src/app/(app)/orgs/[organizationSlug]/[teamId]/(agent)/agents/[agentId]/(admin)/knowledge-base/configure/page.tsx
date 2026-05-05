import { getAgentDetailed } from '@/actions/agents'
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

  const agentDetailed = await getAgentDetailed(
    { organizationSlug, agentId },
    {
      with: {
        configuration: true,
        knowledgeBase: true,
      },
    },
  )

  if (!agentDetailed) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {agentDetailed.knowledgeBase?.status === 'reindexing' && (
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
        enableKnowledgeBaseTool={
          agentDetailed.configuration?.enableKnowledgeBaseTool
        }
      />

      <EditVectorStoreForm
        params={{ organizationSlug, agentId }}
        vectorStore={
          agentDetailed.knowledgeBase?.vectorStore
            ? {
                id: agentDetailed.knowledgeBase.vectorStore.id,
                value: agentDetailed.knowledgeBase.vectorStore,
              }
            : null
        }
      />

      <EditEmbeddingModelSettingsForm
        params={{ organizationSlug, agentId }}
        embeddingModelSettings={
          agentDetailed.knowledgeBase?.embeddingModelSettings
            ? {
                ...agentDetailed.knowledgeBase.embeddingModelSettings,
                provider: agentDetailed.knowledgeBase.embeddingModelSettings
                  .provider
                  ? {
                      id: agentDetailed.knowledgeBase.embeddingModelSettings
                        .provider.id,
                      value:
                        agentDetailed.knowledgeBase.embeddingModelSettings
                          .provider,
                    }
                  : null,
              }
            : null
        }
      />

      <EditTopKForm
        params={{ organizationSlug, agentId }}
        topK={agentDetailed.knowledgeBase?.topK}
      />

      <ReindexKnowledgeBaseForm
        params={{ organizationSlug, agentId }}
        disabled={
          !agentDetailed.knowledgeBase?.isConfigured ||
          agentDetailed.knowledgeBase.status === 'reindexing'
        }
      />
    </div>
  )
}
