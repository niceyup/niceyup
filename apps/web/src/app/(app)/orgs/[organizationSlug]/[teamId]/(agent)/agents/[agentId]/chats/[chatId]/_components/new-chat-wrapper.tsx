// import { getAgentSummary } from '@/actions/agents'
import type {
  AgentParams,
  ChatParams,
  OrganizationTeamParams,
} from '@/lib/types'
import { generateId } from '@workspace/utils'
import { NewChat } from './new-chat'

type Params = OrganizationTeamParams & AgentParams & ChatParams

export async function NewChatWrapper({ params }: { params: Params }) {
  // const agentSummary = await getAgentSummary({
  //   agentId: params.agentId,
  // })

  // Fix: key is used to force a re-render
  return (
    <NewChat
      key={generateId()}
      params={params}
      // suggestions={agentSummary?.systemConfiguration?.suggestions}
    />
  )
}
