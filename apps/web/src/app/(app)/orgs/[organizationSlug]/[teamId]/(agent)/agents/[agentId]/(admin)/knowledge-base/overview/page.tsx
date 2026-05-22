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
import { Settings2Icon, UnplugIcon } from 'lucide-react'
import Link from 'next/link'
import { KnowledgeBaseAlertReindexing } from '../_components/knowledge-base-alert'

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
        configuration: true,
        knowledgeBase: true,
      },
    },
  )

  if (!agentDetailed) {
    return null
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

  if (!agentDetailed.configuration?.enableKnowledgeBaseTool) {
    return (
      <div className="w-full rounded-lg border bg-background p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Knowledge Base Not Enabled</EmptyTitle>
            <EmptyDescription>
              Enable this tool to allow the AI agent to use the knowledge base
              to learn and respond.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <Button asChild>
              <Link
                href={`/orgs/${organizationSlug}/${teamId}/agents/${agentId}/knowledge-base/configure`}
              >
                <UnplugIcon />
                Enable
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {agentDetailed.knowledgeBase.status === 'reindexing' && (
        <KnowledgeBaseAlertReindexing params={{ organizationSlug, agentId }} />
      )}

      <div className="rounded-lg border bg-background p-4">
        <p className="py-24 text-center text-muted-foreground text-xs">
          Coming soon
        </p>
      </div>
    </div>
  )
}
