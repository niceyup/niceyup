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
import { CreateModelProviderForm } from '../../_components/create-model-provider-form'
import { EditModelProviderWrapper } from './_components/edit-model-provider-wrapper'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { modelProviderId: string }>
}>) {
  const { organizationSlug, modelProviderId } = await params

  if (modelProviderId === 'create') {
    return (
      <Dialog defaultOpen>
        <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Model Provider</DialogTitle>
          <DialogDescription>
            Update the settings for this model provider.
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
          <EditModelProviderWrapper
            params={{ organizationSlug, modelProviderId }}
          />
        </Suspense>
      </InterceptedDialogContent>
    </Dialog>
  )
}
