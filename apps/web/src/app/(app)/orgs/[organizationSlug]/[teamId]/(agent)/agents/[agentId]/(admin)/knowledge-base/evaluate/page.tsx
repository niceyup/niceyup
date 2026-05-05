import { getAgentDetailed } from '@/actions/agents'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Settings2Icon } from 'lucide-react'
import Link from 'next/link'

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

  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="py-24 text-center text-muted-foreground text-xs">
        Coming soon
      </p>
    </div>
  )
}
