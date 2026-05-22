'use client'

import { queryClient } from '@/lib/react-query'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query'
import { cn } from '@workspace/ui/lib/utils'
import { AlertCircleIcon, InfoIcon, PlayIcon, RotateCwIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function SourceView({
  params,
  sourceId,
  open,
  onOpenChange,
}: {
  params: Params
  sourceId: string
  indexedSourceId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return (
    <>
      {isDesktop && (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Source View</SheetTitle>
              <SheetDescription>View the source here.</SheetDescription>
            </SheetHeader>
            <SourceViewContent
              params={params}
              sourceId={sourceId}
              className="px-4"
            />
          </SheetContent>
        </Sheet>
      )}

      {!isDesktop && (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="h-full">
            <DrawerHeader className="text-left">
              <DrawerTitle>Source View</DrawerTitle>
              <DrawerDescription>View the source here.</DrawerDescription>
            </DrawerHeader>
            <SourceViewContent
              params={params}
              sourceId={sourceId}
              className="px-4"
            />
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}

function SourceViewContent({
  params,
  sourceId,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  params: Params
  sourceId: string
}) {
  const { data, isLoading } = sdk.$reactQuery.useGetSource({
    headers: {
      'x-organization-slug': params.organizationSlug,
    },
    sourceId,
  })

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        <Skeleton className="h-15 w-full" />
        <Skeleton className="h-35 w-full" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      {data.summary.ready && (
        <SourceViewAlertReady params={params} sourceId={sourceId} />
      )}

      {data.summary.processing && (
        <SourceViewAlertProcessing params={params} sourceId={sourceId} />
      )}

      {data.summary.failed && (
        <SourceViewAlertFailed params={params} sourceId={sourceId} />
      )}

      <p className="py-24 text-center text-muted-foreground text-xs">
        Coming soon ({sourceId})
      </p>
    </div>
  )
}

function SourceViewAlertReady({
  params,
  sourceId,
}: {
  params: Params
  sourceId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleTrigger = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.triggerSourceIngestion({
          headers: {
            'x-organization-slug': params.organizationSlug,
          },
          data: {
            status: 'ready',
            sources: [sourceId],
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source ingestion started')
      } catch {
        toast.error('Failed to start source ingestion')
      }

      await queryClient.refetchQueries({
        queryKey: sdk.$reactQuery.getSourceQueryKey({
          sourceId,
        }),
      })
    })
  }

  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>Source not ingested</AlertTitle>
      <AlertDescription>
        This source has not been ingested yet and is ready to be processed.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          className="text-foreground"
          onClick={handleTrigger}
          disabled={isPending}
        >
          {isPending ? <Spinner /> : <PlayIcon />}
          Ingest
        </Button>
      </AlertAction>
    </Alert>
  )
}

function SourceViewAlertProcessing({
  params,
  sourceId,
}: {
  params: Params
  sourceId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleCancel = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.cancelSource({
          headers: {
            'x-organization-slug': params.organizationSlug,
          },
          sourceId,
          data: {},
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source cancellation started')
      } catch {
        toast.error('Failed to start source cancellation')
      }

      await queryClient.refetchQueries({
        queryKey: sdk.$reactQuery.getSourceQueryKey({
          sourceId,
        }),
      })
    })
  }

  return (
    <Alert>
      <Spinner />
      <AlertTitle>Ingesting source</AlertTitle>
      <AlertDescription>
        This source is currently being ingested. You can cancel this operation
        at any time.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending && <Spinner />}
          Cancel
        </Button>
      </AlertAction>
    </Alert>
  )
}

function SourceViewAlertFailed({
  params,
  sourceId,
}: {
  params: Params
  sourceId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleTrigger = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.triggerSourceIngestion({
          headers: {
            'x-organization-slug': params.organizationSlug,
          },
          data: {
            status: 'failed',
            sources: [sourceId],
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source ingestion started')
      } catch {
        toast.error('Failed to start source ingestion')
      }

      await queryClient.refetchQueries({
        queryKey: sdk.$reactQuery.getSourceQueryKey({
          sourceId,
        }),
      })
    })
  }

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Source failed to ingest</AlertTitle>
      <AlertDescription>
        Ingestion failed for this source. Retry to try again.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          className="text-foreground"
          onClick={handleTrigger}
          disabled={isPending}
        >
          {isPending ? <Spinner /> : <RotateCwIcon />}
          Retry
        </Button>
      </AlertAction>
    </Alert>
  )
}
