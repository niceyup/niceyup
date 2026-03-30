import type { OrganizationTeamParams } from '@/lib/types'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateVectorStoreForm } from '../../_components/create-vector-store-form'

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
        callbackUrl={`/orgs/${organizationSlug}/~/integrations/vector-stores`}
      >
        <DialogHeader>
          <DialogTitle>Add Vector Store</DialogTitle>
          <DialogDescription>
            Add a new vector store to store and query embeddings.
          </DialogDescription>
        </DialogHeader>

        <CreateVectorStoreForm />
      </InterceptedDialogContent>
    </Dialog>
  )
}
