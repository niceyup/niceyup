'use client'

import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import * as React from 'react'
import { toast } from 'sonner'
import {
  SourceExplorer,
  SourceExplorerProvider,
  useSourceExplorerContext,
} from './source-explorer'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function SourceManager({
  params,
  sourceIds,
  totalCount,
  onSelectSource,
}: {
  params: Params
  sourceIds?: string[]
  totalCount?: number
  onSelectSource?: (sourceId: string | null) => void
}) {
  const [loadedRootItems, setLoadedRootItems] = React.useState(false)

  return (
    <SourceExplorerProvider
      params={params}
      initialSourceIds={sourceIds}
      onLoadedRootItems={() => setLoadedRootItems(true)}
      onClickItem={({ sourceId }) => onSelectSource?.(sourceId || null)}
    >
      {loadedRootItems ? (
        <SourceManagerContent
          params={params}
          initialSourceIds={sourceIds}
          totalCount={totalCount}
        />
      ) : (
        <SourceManagerSkeleton />
      )}
    </SourceExplorerProvider>
  )
}

function SourceManagerContent({
  params,
  initialSourceIds,
  totalCount,
}: {
  params: Params
  initialSourceIds?: string[]
  totalCount?: number
}) {
  const { tree, checkedItems, setCheckedItems, loadingSources } =
    useSourceExplorerContext()

  const [defaultSourceIds, setDefaultSourceIds] = React.useState<string[]>(
    initialSourceIds || [],
  )
  const [sourceIds, setSourceIds] = React.useState<string[]>([])
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    const checkedSourceIds = checkedItems.map((itemId) => {
      const itemInstance = tree.getItemInstance(itemId)
      return itemInstance.getItemData().sourceId as string
    })

    setSourceIds([...new Set(checkedSourceIds)])
  }, [checkedItems])

  const hasDiff = React.useMemo(() => {
    if (sourceIds.length !== defaultSourceIds.length) {
      return true
    }

    return (
      sourceIds.some((sourceId) => !defaultSourceIds.includes(sourceId)) ||
      defaultSourceIds.some((sourceId) => !sourceIds.includes(sourceId))
    )
  }, [sourceIds, defaultSourceIds])

  const handleCancel = () => {
    const childrenIds = tree
      .getItems()
      .filter((item) => {
        const sourceId = item.getItemData().sourceId
        return sourceId && defaultSourceIds.includes(sourceId)
      })
      .map((item) => item.getId())

    setCheckedItems(childrenIds)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        const addSourceIds = sourceIds.filter(
          (sourceId) => !defaultSourceIds.includes(sourceId),
        )
        const removeSourceIds = defaultSourceIds.filter(
          (sourceId) => !sourceIds.includes(sourceId),
        )

        const { error } = await sdk.updateSourceIndexes({
          agentId: params.agentId,
          data: {
            organizationSlug: params.organizationSlug,
            add: addSourceIds,
            remove: removeSourceIds,
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        setDefaultSourceIds(sourceIds)
        toast.success('Source indexing started')
      } catch {
        toast.error('Failed to start source indexing')
      }
    })
  }

  return (
    <div className="flex w-full flex-col">
      <div className="rounded-lg border bg-background p-4">
        <SourceExplorer />
      </div>

      <div className="sticky bottom-0 z-40 self-center py-4">
        <div className="flex items-center justify-end gap-2 rounded-lg border bg-background p-2">
          {loadingSources ? (
            <Skeleton className="h-5 w-35 px-2" />
          ) : (
            <p className="px-2 text-muted-foreground text-xs">
              {totalCount} of {sourceIds.length} source(s) selected.
            </p>
          )}

          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />

          <Button
            type="reset"
            size="sm"
            variant="secondary"
            onClick={handleCancel}
            disabled={loadingSources || isPending || !hasDiff}
          >
            Discard
          </Button>
          <Button
            type="submit"
            size="sm"
            onClick={handleSave}
            disabled={loadingSources || isPending || !hasDiff}
          >
            {isPending && <Spinner />}
            Index
          </Button>
        </div>
      </div>
    </div>
  )
}

function SourceManagerSkeleton() {
  return (
    <div className="flex w-full flex-col">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="size-9" />
            <Skeleton className="size-9" />
          </div>

          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`skeleton-${index + 1}`}
              className="flex flex-row items-center gap-2"
            >
              <Skeleton className="size-5 rounded-sm" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
