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
import { CreateVectorStoreForm } from '../../_components/create-vector-store-form'
import { EditVectorStoreWrapper } from './_components/edit-vector-store-wrapper'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { vectorStoreId: string }>
}>) {
  const { organizationSlug, vectorStoreId } = await params

  if (vectorStoreId === 'create') {
    return (
      <Dialog defaultOpen>
        <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Vector Store</DialogTitle>
          <DialogDescription>
            Update the settings for this vector store.
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
          <EditVectorStoreWrapper
            params={{ organizationSlug, vectorStoreId }}
          />
        </Suspense>
      </InterceptedDialogContent>
    </Dialog>
  )
}
