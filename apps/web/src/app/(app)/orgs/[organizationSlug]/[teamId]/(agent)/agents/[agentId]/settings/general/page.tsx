import { isOrganizationMemberAdmin } from '@/actions/membership'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { cacheTag } from 'next/cache'
import { DeleteAgentForm } from './_components/delete-agent-form'
import { EditAgentDescriptionForm } from './_components/edit-agent-description-form'
import { EditAgentLogoForm } from './_components/edit-agent-logo-form'
import { EditAgentNameForm } from './_components/edit-agent-name-form'
import { EditAgentSlugForm } from './_components/edit-agent-slug-form'
import { ViewAgentId } from './_components/view-agent-id'

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

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & AgentParams>
}>) {
  const { organizationSlug, teamId, agentId } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  const agent = await getAgent({ organizationSlug, agentId })

  if (!agent) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditAgentNameForm
        params={{ organizationSlug, agentId }}
        name={agent.name}
        isAdmin={isAdmin}
      />

      <EditAgentDescriptionForm
        params={{ organizationSlug, agentId }}
        description={agent.description}
        isAdmin={isAdmin}
      />

      <EditAgentSlugForm
        params={{ organizationSlug, agentId }}
        slug={agent.slug}
        isAdmin={isAdmin}
      />

      <EditAgentLogoForm
        params={{ organizationSlug, agentId }}
        logo={agent.logo}
        isAdmin={isAdmin}
      />

      <ViewAgentId id={agentId} />

      {isAdmin && (
        <DeleteAgentForm params={{ organizationSlug, teamId, agentId }} />
      )}
    </div>
  )
}
