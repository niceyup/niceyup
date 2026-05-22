import { getAgentDetailed } from '@/actions/agents'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { PlusIcon, Settings2Icon } from 'lucide-react'
import { cacheTag } from 'next/cache'
import Link from 'next/link'
import { IndexedSourceAlert } from './_components/indexed-source-alert'
import { SourceManagerWithPreview } from './_components/source-manager-with-preview'

async function getSourceIndexingSummary(params: {
  organizationSlug: string
  agentId: string
}) {
  'use cache: private'
  cacheTag('trigger-source-indexing')

  const { data } = await sdk.getSourceIndexingSummary({
    headers: {
      'x-organization-slug': params.organizationSlug,
    },
    agentId: params.agentId,
  })

  return data?.summary || null
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, teamId, agentId } = await params

  const agentDetailed = await getAgentDetailed(
    { organizationSlug, agentId },
    {
      with: {
        knowledgeBase: true,
      },
    },
  )

  if (!agentDetailed) {
    return null
  }

  if (agentDetailed.knowledgeBase?.status === 'reindexing') {
    return (
      <div className="w-full rounded-lg border bg-background p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Reindexing Knowledge Base</EmptyTitle>
            <EmptyDescription>
              The knowledge base is currently being reindexed. Changes will be
              available once the process is complete.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  if (!agentDetailed.knowledgeBase?.isConfigured) {
    return (
      <div className="w-full rounded-lg border bg-background p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Knowledge Base Not Configured</EmptyTitle>
            <EmptyDescription>
              Configure the vector store and embedding model to enable the
              knowledge base.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <Button asChild>
              <Link
                href={`/orgs/${organizationSlug}/${teamId}/agents/${agentId}/knowledge-base/configure`}
              >
                <Settings2Icon />
                Configure
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const [{ data: agentSourcesData }, { data: sourcesData }] = await Promise.all(
    [
      sdk.listIndexedSources({
        headers: {
          'x-organization-slug': organizationSlug,
        },
        agentId,
      }),
      sdk.listSources({
        headers: {
          'x-organization-slug': organizationSlug,
        },
      }),
    ],
  )

  const totalCount = sourcesData?.sources.length

  if (!totalCount) {
    return (
      <div className="w-full rounded-lg border bg-background p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No Sources Yet</EmptyTitle>
            <EmptyDescription>Add a source to get started.</EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <Button asChild>
              <Link href={`/orgs/${organizationSlug}/~/sources`}>
                <PlusIcon />
                Add source
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const summary = await getSourceIndexingSummary({
    organizationSlug,
    agentId,
  })

  return (
    <div className="flex w-full flex-col gap-4">
      <IndexedSourceAlert
        params={{ organizationSlug, agentId }}
        summary={summary}
      />

      <SourceManagerWithPreview
        params={{ organizationSlug, agentId }}
        sourceIds={agentSourcesData?.indexedSources.map(
          ({ sourceId }) => sourceId,
        )}
      />
    </div>
  )
}
