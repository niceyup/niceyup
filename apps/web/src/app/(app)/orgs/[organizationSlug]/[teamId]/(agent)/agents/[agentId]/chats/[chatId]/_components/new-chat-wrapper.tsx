import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  ChatParams,
  OrganizationTeamParams,
} from '@/lib/types'
import { generateId } from '@workspace/utils'
import { NewChat } from './new-chat'

type Params = OrganizationTeamParams & AgentParams & ChatParams

export async function NewChatWrapper({ params }: { params: Params }) {
  const { data } = await sdk.getAgent({
    agentId: params.agentId,
    params: {
      organizationSlug: params.organizationSlug,
    },
  })

  // Fix: key is used to force a re-render
  return (
    <NewChat
      key={generateId()}
      params={params}
      suggestions={data?.agent?.suggestions}
    />
  )
}
