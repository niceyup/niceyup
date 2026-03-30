import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { EditMcpServerForm } from '../../../_components/edit-mcp-server-form'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  mcpServerId: string
}

export async function EditMcpServerWrapper({
  params,
}: {
  params: Params
}) {
  const { data } = await sdk.getMcpServer({
    mcpServerId: params.mcpServerId,
    params: { organizationSlug: params.organizationSlug },
  })

  if (!data) {
    return null
  }

  return <EditMcpServerForm initialData={data.mcpServer} />
}
