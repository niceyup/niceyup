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
import Link from 'next/link'
import { ManageSourcesWithPreview } from './_components/manage-sources-with-preview'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, teamId, agentId } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  const [{ data: agentSourcesData }, { data: sourcesData }] = await Promise.all(
    [
      sdk.listAgentSources({
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

  return (
    <ManageSourcesWithPreview
      params={{ organizationSlug, teamId, agentId }}
      sourceIds={agentSourcesData?.sources.map(({ id }) => id)}
      totalCount={totalCount}
    />
  )
}
