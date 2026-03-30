import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Suspense } from 'react'
import { CreateMcpServerForm } from '../../_components/create-mcp-server-form'
import { EditMcpServerWrapper } from './_components/edit-mcp-server-wrapper'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { mcpServerId: string }>
}>) {
  const { organizationSlug, mcpServerId } = await params

  if (mcpServerId === 'create') {
    return (
      <Dialog defaultOpen>
        <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit MCP Server</DialogTitle>
          <DialogDescription>
            Update the settings for this MCP server.
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />

              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          }
        >
          <EditMcpServerWrapper params={{ organizationSlug, mcpServerId }} />
        </Suspense>
      </InterceptedDialogContent>
    </Dialog>
  )
}
