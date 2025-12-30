import { isOrganizationMemberAdmin } from '@/actions/membership'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateSourceForm } from '../../../../../../orgs/[organizationSlug]/[teamId]/(main)/(admin)/sources/create/_components/create-source-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  if (!isAdmin) {
    return null
  }

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent>
        <DialogHeader>
          <DialogTitle className="text-center font-semibold text-xl leading-none">
            Create a Source
          </DialogTitle>
        </DialogHeader>

        <div className="mt-5">
          <CreateSourceForm />
        </div>
      </InterceptedDialogContent>
    </Dialog>
  )
}
