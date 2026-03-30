import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { EditVectorStoreForm } from '../../_components/edit-vector-store-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { vectorStoreId: string }>
}>) {
  const { organizationSlug, vectorStoreId } = await params

  const { data } = await sdk.getVectorStore({
    vectorStoreId,
    params: { organizationSlug },
  })

  if (!data) {
    return null
  }

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        callbackUrl={`/orgs/${organizationSlug}/~/integrations/vector-stores`}
      >
        <DialogHeader>
          <DialogTitle>Edit Vector Store</DialogTitle>
          <DialogDescription>
            Update the settings for this vector store.
          </DialogDescription>
        </DialogHeader>

        <EditVectorStoreForm initialData={data.vectorStore} />
      </InterceptedDialogContent>
    </Dialog>
  )
}
