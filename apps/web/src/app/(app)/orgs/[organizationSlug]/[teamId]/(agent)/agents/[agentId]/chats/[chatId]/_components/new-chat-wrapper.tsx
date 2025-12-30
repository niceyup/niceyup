import { randomUUID } from 'node:crypto'
import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  ChatParams,
  OrganizationTeamParams,
} from '@/lib/types'
import { cacheTag } from 'next/cache'
import { NewChat } from './new-chat'

async function getAgentConfiguration(params: {
  organizationSlug: string
  agentId: string
}) {
  'use cache: private'
  cacheTag('update-agent-configuration')

  const { data } = await sdk.getAgentConfiguration({
    agentId: params.agentId,
    params: {
      organizationSlug: params.organizationSlug,
    },
  })

  return data?.agent || null
}

type Params = OrganizationTeamParams & AgentParams & ChatParams

export async function NewChatWrapper({ params }: { params: Params }) {
  const agentConfiguration = await getAgentConfiguration(params)

  // Fix: key is used to force a re-render
  return (
    <NewChat
      key={randomUUID()}
      params={params}
      suggestions={agentConfiguration?.suggestions}
    />
  )
}
