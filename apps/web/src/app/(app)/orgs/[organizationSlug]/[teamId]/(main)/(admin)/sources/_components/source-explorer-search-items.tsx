'use client'

import type { OrganizationTeamParams } from '@/lib/types'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { cn } from '@workspace/ui/lib/utils'
import { FileIcon, FolderIcon, SquareArrowOutUpRightIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import type { listSearchItemsInSourceExplorerNode } from '../_actions/source-explorer-nodes'
import { SourceView } from './source-view'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function SourceExplorerSearchItems({
  params,
  search,
  listSourceItems,
}: {
  params: Params
  search?: string
  listSourceItems: Awaited<
    ReturnType<typeof listSearchItemsInSourceExplorerNode>
  >
}) {
  return (
    <>
      {!listSourceItems.length && (
        <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No sources found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any sources.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!listSourceItems.length && (
        <div className="flex w-full max-w-4xl flex-col divide-y divide-border rounded-lg border bg-background">
          {listSourceItems.map((item) => (
            <SourceExplorerSearchItem
              key={item.id}
              params={params}
              item={item}
            />
          ))}
        </div>
      )}
    </>
  )
}

function SourceExplorerSearchItem({
  params,
  item,
}: {
  params: Params
  item: Awaited<ReturnType<typeof listSearchItemsInSourceExplorerNode>>[number]
}) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)

  const isFolder = !item.sourceId

  return (
    <>
      <div
        className="flex cursor-pointer flex-row items-center justify-start gap-2 p-3 hover:bg-muted/50"
        onClick={() => {
          if (isFolder) {
            router.push(
              `/orgs/${params.organizationSlug}/~/sources?folderId=${item.id}`,
            )
          } else {
            setOpen(true)
          }
        }}
      >
        {isFolder ? (
          <FolderIcon className="ml-2 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileIcon className="ml-2 size-4 shrink-0 text-muted-foreground" />
        )}

        <span
          className={cn('line-clamp-1 break-all font-medium text-sm', {
            italic: !item.name,
          })}
        >
          {item.name || (isFolder ? 'Unnamed folder' : 'Untitled')}
        </span>

        {item.sourceType && (
          <Badge variant="secondary" className="text-[11px]">
            {item.sourceType}
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/orgs/${params.organizationSlug}/~/sources?${isFolder ? 'folderId' : 'itemId'}=${item.id}`}
            target="_blank"
          >
            <SquareArrowOutUpRightIcon />
          </Link>
        </Button>
      </div>

      {item.sourceId && (
        <SourceView
          params={params}
          sourceId={item.sourceId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
