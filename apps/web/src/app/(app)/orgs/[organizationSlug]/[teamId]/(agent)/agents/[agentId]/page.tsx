import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { redirect } from 'next/navigation'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, teamId, agentId } = await params

  return redirect(
    `/orgs/${organizationSlug}/${teamId}/agents/${agentId}/chats/new`,
  )
}
