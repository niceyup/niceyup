import { enableSourceRetrievalTool } from '@/actions/agents'
import { Sidebar, type SidebarItem } from '@/components/sidebar'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { cn } from '@workspace/ui/lib/utils'
import { SquareArrowOutUpRightIcon, UnplugIcon } from 'lucide-react'
import Link from 'next/link'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
  children: React.ReactNode
}>) {
  const { organizationSlug, teamId, agentId } = await params

  const isEnabled = await enableSourceRetrievalTool({
    agentId,
  })

  const items: SidebarItem[] = [
    {
      label: 'Overview',
      href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/sources/overview`,
    },
    {
      label: 'Indexing',
      href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/sources/indexing`,
    },
    {
      label: 'Documentation',
      href: 'https://docs.niceyup.com/sources',
      target: '_blank',
      icon: <SquareArrowOutUpRightIcon className="ml-auto" />,
    },
  ]

  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div
          className={cn(
            'mx-auto flex max-w-5xl flex-col items-start gap-4',
            { 'max-w-4xl': !isEnabled },
            'justify-between md:flex-row md:items-center',
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Sources</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Manage the data sources this AI agent can use to learn and
                respond.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        {!isEnabled && (
          <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Sources Not Enabled</EmptyTitle>
                <EmptyDescription>
                  Enable source retrieval in Tools to let this AI agent use
                  external knowledge to learn and respond.
                </EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild>
                  <Link
                    href={`/orgs/${organizationSlug}/${teamId}/agents/${agentId}/settings/advanced`}
                  >
                    <UnplugIcon />
                    Enable
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        )}

        {isEnabled && (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 lg:flex-row">
            <div
              className={cn(
                'flex w-full flex-col gap-1 lg:w-55',
                'lg:sticky lg:top-[58px] lg:self-start',
              )}
            >
              <Sidebar items={items} />
            </div>

            <div
              className={cn(
                'flex w-full flex-1 flex-col gap-4',
                'lg:sticky lg:top-[58px] lg:self-start',
              )}
            >
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
