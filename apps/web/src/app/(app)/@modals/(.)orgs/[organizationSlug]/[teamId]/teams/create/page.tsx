import { getMembership } from '@/actions/membership'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateTeamForm } from '../../../../../../orgs/[organizationSlug]/[teamId]/(main)/teams/(admin)/create/_components/create-team-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const membership = await getMembership({ organizationSlug })

  const isAdmin = membership?.isAdmin

  if (!isAdmin) {
    return null
  }

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a team within your organization.
          </DialogDescription>
        </DialogHeader>

        <CreateTeamForm
          modal
          organizationSlug={organizationSlug}
          organizationId={membership.organizationId}
        />
      </InterceptedDialogContent>
    </Dialog>
  )
}
