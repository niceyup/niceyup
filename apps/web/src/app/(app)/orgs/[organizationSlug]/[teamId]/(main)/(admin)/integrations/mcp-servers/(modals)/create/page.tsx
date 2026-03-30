import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateMcpServerForm } from '../../_components/create-mcp-server-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        callbackUrl={`/orgs/${organizationSlug}/~/integrations/mcp-servers`}
      >
        <DialogHeader>
          <DialogTitle>Add MCP Server</DialogTitle>
          <DialogDescription>
            Add a new MCP server to extend agent capabilities.
          </DialogDescription>
        </DialogHeader>

        <CreateMcpServerForm />
      </InterceptedDialogContent>
    </Dialog>
  )
}
