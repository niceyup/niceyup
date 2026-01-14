import { isOrganizationMemberAdmin } from '@/actions/membership'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
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
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>Add a data source to an agent.</DialogDescription>
        </DialogHeader>

        <CreateSourceForm modal organizationSlug={organizationSlug} />
      </InterceptedDialogContent>
    </Dialog>
  )
}
