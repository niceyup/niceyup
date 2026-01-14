'use client'

import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
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
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query'
import * as React from 'react'
import { ManageSources } from './manage-sources'
import { SourcePreview } from './source-preview'

type Params = OrganizationTeamParams & AgentParams

export function ManageSourcesWithPreview({
  params,
  sourceIds,
  totalCount,
}: {
  params: Params
  sourceIds?: string[]
  totalCount?: number
}) {
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(
    null,
  )
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return (
    <>
      <ManageSources
        params={params}
        sourceIds={sourceIds}
        totalCount={totalCount}
        onSelectSource={(sourceId) => {
          if (sourceId) {
            setSelectedSourceId(sourceId)
            setOpen(true)
          }
        }}
      />

      {selectedSourceId && isDesktop && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Source preview</SheetTitle>
              <SheetDescription>Preview the source here.</SheetDescription>
            </SheetHeader>
            <SourcePreview
              params={params}
              selectedSourceId={selectedSourceId}
              className="px-4"
            />
          </SheetContent>
        </Sheet>
      )}

      {selectedSourceId && !isDesktop && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-full">
            <DrawerHeader className="text-left">
              <DrawerTitle>Source preview</DrawerTitle>
              <DrawerDescription>Preview the source here.</DrawerDescription>
            </DrawerHeader>
            <SourcePreview
              params={params}
              selectedSourceId={selectedSourceId}
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
