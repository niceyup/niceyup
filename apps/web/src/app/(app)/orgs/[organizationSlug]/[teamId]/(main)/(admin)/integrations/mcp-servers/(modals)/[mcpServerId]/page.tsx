import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { EditMcpServerForm } from '../../_components/edit-mcp-server-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { mcpServerId: string }>
}>) {
  const { organizationSlug, mcpServerId } = await params

  const { data } = await sdk.getMcpServer({
    mcpServerId,
    params: { organizationSlug },
  })

  if (!data) {
    return null
  }

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        callbackUrl={`/orgs/${organizationSlug}/~/integrations/mcp-servers`}
      >
        <DialogHeader>
          <DialogTitle>Edit MCP Server</DialogTitle>
          <DialogDescription>
            Update the settings for this MCP server.
          </DialogDescription>
        </DialogHeader>

        <EditMcpServerForm initialData={data.mcpServer} />
      </InterceptedDialogContent>
    </Dialog>
  )
}
