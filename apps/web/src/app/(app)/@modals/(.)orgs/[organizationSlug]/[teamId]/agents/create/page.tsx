import { isOrganizationMemberAdmin } from '@/actions/membership'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateAgentForm } from '../../../../../../orgs/[organizationSlug]/[teamId]/(main)/agents/(admin)/create/_components/create-agent-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug, teamId } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  if (!isAdmin) {
    return null
  }

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
          <DialogDescription>
            Create and configure an AI agent.
          </DialogDescription>
        </DialogHeader>

        <CreateAgentForm
          modal
          organizationSlug={organizationSlug}
          teamId={teamId}
        />
      </InterceptedDialogContent>
    </Dialog>
  )
}
