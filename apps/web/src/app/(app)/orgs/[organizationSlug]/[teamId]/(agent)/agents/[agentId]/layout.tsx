import { isOrganizationMemberAdmin } from '@/actions/membership'
import { AgentNotFound } from '@/components/agent-not-found'
import { Header } from '@/components/header'
import { TabBar, type TabItem } from '@/components/tab-bar'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { ChevronLeftIcon } from 'lucide-react'
import { cacheTag } from 'next/cache'
import { Topbar } from '../_components/topbar'

async function getAgent(params: {
  organizationSlug: string
  agentId: string
}) {
  'use cache: private'
  cacheTag('update-agent')

  const { data } = await sdk.getAgent({
    agentId: params.agentId,
    params: { organizationSlug: params.organizationSlug },
  })

  return data?.agent || null
}

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
  children: React.ReactNode
}>) {
  const { organizationSlug, teamId, agentId } = await params

  const agent = await getAgent({ organizationSlug, agentId })

  if (!agent) {
    return (
      <>
        <Header organizationSlug={organizationSlug} teamId={teamId} />

        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <AgentNotFound organizationSlug={organizationSlug} teamId={teamId} />
        </main>
      </>
    )
  }

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  const tabs: TabItem[] = [
    {
      label: <ChevronLeftIcon />,
      href: `/orgs/${organizationSlug}/${teamId}/agents`,
    },
    {
      label: 'Chats',
      href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/chats/new`,
      deep: true,
    },
  ]

  if (isAdmin) {
    tabs.push(
      ...[
        // {
        //   label: 'Activity',
        //   href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/activity`,
        // },
        // {
        //   label: 'Analytics',
        //   href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/analytics`,
        // },
        {
          label: 'Sources',
          href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/sources`,
          deep: true,
        },
        {
          label: 'Tools',
          href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/tools`,
        },
        // {
        //   label: 'Builder',
        //   href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/builder`,
        // },
        // {
        //   label: 'Deploy',
        //   href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/deploy`,
        // }
      ],
    )
  }

  tabs.push({
    label: 'Settings',
    href: `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/settings`,
    deep: true,
  })

  return (
    <>
      <Topbar>
        <Header
          organizationSlug={organizationSlug}
          teamId={teamId}
          activeAgent={agent}
        />

        <TabBar tabs={tabs} />
      </Topbar>

      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        {children}
      </main>
    </>
  )
}
