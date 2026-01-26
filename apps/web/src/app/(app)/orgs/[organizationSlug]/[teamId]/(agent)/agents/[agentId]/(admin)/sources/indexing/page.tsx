import { isOrganizationMemberAdmin } from '@/actions/membership'
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
import { PlusIcon } from 'lucide-react'
import { cacheTag } from 'next/cache'
import Link from 'next/link'
import { SourceIndexAlert } from './_components/source-index-alert'
import { SourceManagerWithPreview } from './_components/source-manager-with-preview'

async function getSourceIndexingStatus(params: {
  organizationSlug: string
  agentId: string
}) {
  'use cache: private'
  cacheTag('trigger-source-indexing')

  const { data } = await sdk.getSourceIndexingStatus({
    agentId: params.agentId,
    params: { organizationSlug: params.organizationSlug },
  })

  return {
    idleCount: data?.idleCount || 0,
    failedCount: data?.failedCount || 0,
  }
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, agentId } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  const [{ data: agentSourcesData }, { data: sourcesData }] = await Promise.all(
    [
      sdk.listSourceIndexes({
        agentId,
        params: { organizationSlug },
      }),
      sdk.listSources({
        params: { organizationSlug },
      }),
    ],
  )

  const totalCount = sourcesData?.sources.length

  if (!totalCount) {
    return (
      <div className="flex w-full flex-col">
        <div className="rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Sources Yet</EmptyTitle>
              <EmptyDescription>Add a source to get started.</EmptyDescription>
            </EmptyHeader>

            {isAdmin && (
              <EmptyContent>
                <Button asChild>
                  <Link href={`/orgs/${organizationSlug}/~/sources`}>
                    <PlusIcon />
                    Add source
                  </Link>
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      </div>
    )
  }

  const { idleCount, failedCount } = await getSourceIndexingStatus({
    organizationSlug,
    agentId,
  })

  return (
    <div className="flex w-full flex-col">
      <SourceIndexAlert
        params={{ organizationSlug, agentId }}
        idleCount={idleCount}
        failedCount={failedCount}
      />

      <SourceManagerWithPreview
        params={{ organizationSlug, agentId }}
        sourceIds={agentSourcesData?.sourceIndexes.map(
          ({ sourceId }) => sourceId,
        )}
        totalCount={totalCount}
      />
    </div>
  )
}
