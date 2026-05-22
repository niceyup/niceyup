'use client'

import { queryClient } from '@/lib/react-query'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
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
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function SourceView({
  params,
  sourceId,
  indexedSourceId,
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
            {indexedSourceId && (
              <IndexedSourceViewContent
                params={params}
                sourceId={sourceId}
                indexedSourceId={indexedSourceId}
                className="px-4"
              />
            )}
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
            {indexedSourceId && (
              <IndexedSourceViewContent
                params={params}
                sourceId={sourceId}
                indexedSourceId={indexedSourceId}
                className="px-4"
              />
            )}
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
        <Skeleton className="h-35 w-full" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <p className="py-24 text-center text-muted-foreground text-xs">
        Coming soon ({sourceId})
      </p>
    </div>
  )
}

function IndexedSourceViewContent({
  params,
  sourceId,
  indexedSourceId,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  params: Params
  sourceId: string
  indexedSourceId: string
}) {
  const { data, isLoading } = sdk.$reactQuery.useGetSourceIndexing({
    headers: {
      'x-organization-slug': params.organizationSlug,
    },
    agentId: params.agentId,
    indexedSourceId,
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
      {data.summary.processing && (
        <IndexedSourceViewAlertProcessing
          params={params}
          indexedSourceId={indexedSourceId}
        />
      )}

      <p className="py-24 text-center text-muted-foreground text-xs">
        Coming soon ({indexedSourceId})
      </p>
    </div>
  )
}

function IndexedSourceViewAlertProcessing({
  params,
  indexedSourceId,
}: {
  params: Params
  indexedSourceId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleCancel = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.cancelSourceIndexing({
          headers: {
            'x-organization-slug': params.organizationSlug,
          },
          agentId: params.agentId,
          indexedSourceId,
          data: {},
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source indexing cancellation started')
      } catch {
        toast.error('Failed to start source indexing cancellation')
      }

      await queryClient.refetchQueries({
        queryKey: sdk.$reactQuery.getSourceIndexingQueryKey({
          agentId: params.agentId,
          indexedSourceId,
        }),
      })
    })
  }

  return (
    <Alert>
      <Spinner />
      <AlertTitle>Indexing source</AlertTitle>
      <AlertDescription>
        This source is currently being indexed. You can cancel this operation at
        any time.
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
