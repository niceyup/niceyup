import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { EditModelProviderForm } from '../../_components/edit-model-provider-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { modelProviderId: string }>
}>) {
  const { organizationSlug, modelProviderId } = await params

  const { data } = await sdk.getModelProvider({
    modelProviderId,
    params: { organizationSlug },
  })

  if (!data) {
    return null
  }

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        callbackUrl={`/orgs/${organizationSlug}/~/integrations/model-providers`}
      >
        <DialogHeader>
          <DialogTitle>Edit Model Provider</DialogTitle>
          <DialogDescription>
            Update the settings for this model provider.
          </DialogDescription>
        </DialogHeader>

        <EditModelProviderForm initialData={data.modelProvider} />
      </InterceptedDialogContent>
    </Dialog>
  )
}
