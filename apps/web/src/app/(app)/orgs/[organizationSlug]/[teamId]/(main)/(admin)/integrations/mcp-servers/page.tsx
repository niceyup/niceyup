import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { cacheTag } from 'next/cache'
import { McpServerList } from './_components/mcp-server-list'

async function listMcpServers(params: {
  organizationSlug: string
}) {
  'use cache: private'
  cacheTag('create-mcp-server', 'update-mcp-server', 'delete-mcp-server')

  const { data } = await sdk.listMcpServers({
    params: {
      organizationSlug: params.organizationSlug,
    },
  })

  return data?.mcpServers || []
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const mcpServers = await listMcpServers({ organizationSlug })

  return <McpServerList params={{ organizationSlug }} mcpServers={mcpServers} />
}
