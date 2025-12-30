import { isOrganizationMemberAdmin } from '@/actions/membership'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
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
      <InterceptedDialogContent>
        <DialogHeader>
          <DialogTitle className="text-center font-semibold text-xl leading-none">
            Create an Agent
          </DialogTitle>
        </DialogHeader>

        <div className="mt-5">
          <CreateAgentForm
            modal
            organizationSlug={organizationSlug}
            teamId={teamId}
          />
        </div>
      </InterceptedDialogContent>
    </Dialog>
  )
}
