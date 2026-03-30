import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateModelProviderForm } from '../../_components/create-model-provider-form'

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
        callbackUrl={`/orgs/${organizationSlug}/~/integrations/model-providers`}
      >
        <DialogHeader>
          <DialogTitle>Add Model Provider</DialogTitle>
          <DialogDescription>
            Add a new model provider to connect and use AI models.
          </DialogDescription>
        </DialogHeader>

        <CreateModelProviderForm />
      </InterceptedDialogContent>
    </Dialog>
  )
}
